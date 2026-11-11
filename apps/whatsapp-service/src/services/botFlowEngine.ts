import {
  WhatsAppBotFlow,
  type IBotFlowStep,
} from "../models/WhatsAppBotFlow";
import { WhatsAppConversation } from "../models/WhatsAppConversation";

interface ProcessMessageParams {
  workspaceId: string;
  accountId: string;
  contactPhone: string;
  messageContent: string;
  conversation: any;
}

interface ProcessResult {
  handled: boolean;
  response?: string;
}

interface SendMessageFn {
  (params: {
    workspaceId: string;
    accountId: string;
    to: string;
    text: string;
  }): Promise<any>;
}

interface SendButtonsFn {
  (params: {
    workspaceId: string;
    accountId: string;
    to: string;
    bodyText: string;
    buttons: any[];
  }): Promise<any>;
}

interface SendListFn {
  (params: {
    workspaceId: string;
    accountId: string;
    to: string;
    bodyText: string;
    buttonText: string;
    sections: any[];
  }): Promise<any>;
}

let _sendTextMessage: SendMessageFn | null = null;
let _sendInteractiveButtons: SendButtonsFn | null = null;
let _sendInteractiveList: SendListFn | null = null;

export function configureBotFlowEngine(fns: {
  sendTextMessage: SendMessageFn;
  sendInteractiveButtons?: SendButtonsFn;
  sendInteractiveList?: SendListFn;
}) {
  _sendTextMessage = fns.sendTextMessage;
  _sendInteractiveButtons = fns.sendInteractiveButtons || null;
  _sendInteractiveList = fns.sendInteractiveList || null;
}

export class BotFlowEngine {
  static async processMessage(
    params: ProcessMessageParams
  ): Promise<ProcessResult> {
    const { conversation } = params;

    if (conversation.mode === "workflow" && conversation.activeWorkflowId) {
      const continued = await this.continueWorkflow(params);
      if (continued.handled) {
        return continued;
      }
    }

    return this.checkTriggers(params);
  }

  private static async checkTriggers(
    params: ProcessMessageParams
  ): Promise<ProcessResult> {
    const {
      workspaceId,
      accountId,
      contactPhone,
      messageContent,
      conversation,
    } = params;

    const flows = await WhatsAppBotFlow.find({
      workspaceId,
      accountId,
      isActive: true,
      triggerKeywords: { $exists: true, $ne: [] },
    }).lean();

    const lowerContent = messageContent.toLowerCase().trim();

    for (const flow of flows) {
      const matched = (flow.triggerKeywords || []).some((kw: string) =>
        lowerContent.includes(kw.toLowerCase().trim())
      );

      if (!matched) {
        continue;
      }

      const steps = flow.steps as IBotFlowStep[];
      if (!steps || steps.length === 0) {
        continue;
      }

      let firstStep = steps[0];

      const directMatch = steps.find(
        (s) =>
          s.type === "keyword_match" &&
          s.data.keywords?.some(
            (k: string) => k.toLowerCase().trim() === lowerContent
          )
      );
      if (directMatch) {
        const matchedKeyword = lowerContent;
        const conn = directMatch.connections?.find(
          (c) => c.label?.toLowerCase().trim() === matchedKeyword
        );
        if (conn) {
          const targetStep = steps.find((s) => s.id === conn.targetStepId);
          if (targetStep) {
            firstStep = targetStep;
          }
        }
      }

      const namedStep = steps.find((s) => {
        if (s.id === `step-${lowerContent.replace(/[^a-z0-9]/g, "")}`) {
          return true;
        }
        if (
          s.type === "send_message" &&
          lowerContent === "view plans" &&
          s.id === "step-viewplans"
        ) {
          return true;
        }
        if (
          s.type === "send_message" &&
          lowerContent === "call us" &&
          s.id === "step-callus"
        ) {
          return true;
        }
        return false;
      });
      if (namedStep) {
        firstStep = namedStep;
      }

      await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
        $set: {
          mode: "workflow",
          activeWorkflowId: (flow as any)._id.toString(),
          "metadata.currentStepId": firstStep.id,
          "metadata.workflowStartedAt": new Date().toISOString(),
        },
      });

      const result = await this.executeStep({
        step: firstStep,
        allSteps: steps,
        workspaceId,
        accountId,
        contactPhone,
        conversation,
        messageContent,
        flowId: (flow as any)._id.toString(),
      });

      return result;
    }

    return { handled: false };
  }

  private static async continueWorkflow(
    params: ProcessMessageParams
  ): Promise<ProcessResult> {
    const {
      workspaceId,
      accountId,
      contactPhone,
      messageContent,
      conversation,
    } = params;

    const flowDoc = await WhatsAppBotFlow.findById(
      conversation.activeWorkflowId
    ).lean();
    if (!flowDoc) {
      await this.endWorkflow(conversation);
      return { handled: false };
    }
    const flow = flowDoc as any;

    const steps = flow.steps as IBotFlowStep[];
    const currentStepId = conversation.metadata?.currentStepId;

    if (!currentStepId) {
      await this.endWorkflow(conversation);
      return { handled: false };
    }

    const currentStep = steps.find((s) => s.id === currentStepId);
    if (!currentStep) {
      await this.endWorkflow(conversation);
      return { handled: false };
    }

    let nextStepId: string | undefined;

    switch (currentStep.type) {
      case "send_message":
      case "delay": {
        nextStepId = currentStep.connections?.[0]?.targetStepId;
        break;
      }

      case "wait_for_reply": {
        nextStepId = currentStep.connections?.[0]?.targetStepId;
        break;
      }

      case "keyword_match": {
        const lowerMsg = messageContent.toLowerCase().trim();
        const keywords = currentStep.data.keywords || [];
        const matchType = currentStep.data.matchType || "contains";

        for (let i = 0; i < keywords.length; i++) {
          const kw = keywords[i].toLowerCase().trim();
          let isMatch = false;

          if (matchType === "exact") {
            isMatch = lowerMsg === kw;
          } else if (matchType === "regex") {
            try {
              isMatch = new RegExp(kw, "i").test(messageContent);
            } catch {
              isMatch = false;
            }
          } else {
            isMatch = lowerMsg.includes(kw);
          }

          if (isMatch) {
            nextStepId =
              currentStep.connections?.[i]?.targetStepId ||
              currentStep.connections?.[0]?.targetStepId;
            break;
          }
        }

        if (!nextStepId && currentStep.data.fallbackStepId) {
          nextStepId = currentStep.data.fallbackStepId;
        }

        if (!nextStepId) {
          nextStepId =
            currentStep.connections?.[currentStep.connections.length - 1]
              ?.targetStepId;
        }
        break;
      }

      case "quick_reply": {
        const lowerMsg = messageContent.toLowerCase().trim();
        const buttons = currentStep.data.buttons || [];

        for (let i = 0; i < buttons.length; i++) {
          if (
            lowerMsg === buttons[i].title.toLowerCase().trim() ||
            lowerMsg === buttons[i].id.toLowerCase().trim()
          ) {
            nextStepId =
              currentStep.connections?.[i]?.targetStepId ||
              currentStep.connections?.[0]?.targetStepId;
            break;
          }
        }

        if (!nextStepId && currentStep.data.fallbackStepId) {
          nextStepId = currentStep.data.fallbackStepId;
        }

        if (!nextStepId) {
          return { handled: false };
        }
        break;
      }

      case "ai_reply": {
        nextStepId = currentStep.connections?.[0]?.targetStepId;
        return {
          handled: false,
          response: currentStep.data.aiContext || undefined,
        };
      }

      case "assign_human": {
        await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
          $set: { mode: "human" },
          $unset: { activeWorkflowId: 1, "metadata.currentStepId": 1 },
        });
        return { handled: true, response: currentStep.data.message };
      }

      default: {
        nextStepId = currentStep.connections?.[0]?.targetStepId;
        break;
      }
    }

    if (!nextStepId) {
      await this.endWorkflow(conversation);
      return { handled: true };
    }

    const nextStep = steps.find((s) => s.id === nextStepId);
    if (!nextStep) {
      await this.endWorkflow(conversation);
      return { handled: true };
    }

    await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
      $set: { "metadata.currentStepId": nextStep.id },
    });

    return this.executeStep({
      step: nextStep,
      allSteps: steps,
      workspaceId,
      accountId,
      contactPhone,
      conversation,
      messageContent,
      flowId: conversation.activeWorkflowId,
    });
  }

  private static async executeStep(params: {
    step: IBotFlowStep;
    allSteps: IBotFlowStep[];
    workspaceId: string;
    accountId: string;
    contactPhone: string;
    conversation: any;
    messageContent: string;
    flowId: string;
  }): Promise<ProcessResult> {
    const {
      step,
      allSteps,
      workspaceId,
      accountId,
      contactPhone,
      conversation,
    } = params;

    switch (step.type) {
      case "send_message": {
        if (step.data.message && _sendTextMessage) {
          await _sendTextMessage({
            workspaceId,
            accountId,
            to: contactPhone,
            text: step.data.message,
          });
        }

        const nextId = step.connections?.[0]?.targetStepId;
        if (nextId) {
          const nextStep = allSteps.find((s) => s.id === nextId);
          if (
            nextStep &&
            nextStep.type !== "wait_for_reply" &&
            nextStep.type !== "keyword_match" &&
            nextStep.type !== "quick_reply"
          ) {
            await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
              $set: { "metadata.currentStepId": nextStep.id },
            });
            return this.executeStep({ ...params, step: nextStep });
          }
          if (nextStep) {
            await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
              $set: { "metadata.currentStepId": nextStep.id },
            });
          }
        } else {
          await this.endWorkflow(conversation);
        }

        return { handled: true, response: step.data.message };
      }

      case "quick_reply": {
        if (
          step.data.message &&
          step.data.buttons &&
          step.data.buttons.length > 0 &&
          _sendInteractiveButtons
        ) {
          await _sendInteractiveButtons({
            workspaceId,
            accountId,
            to: contactPhone,
            bodyText: step.data.message,
            buttons: step.data.buttons,
          });
        }
        return { handled: true };
      }

      case "list_message": {
        if (
          step.data.message &&
          step.data.listSections &&
          step.data.listSections.length > 0 &&
          _sendInteractiveList
        ) {
          await _sendInteractiveList({
            workspaceId,
            accountId,
            to: contactPhone,
            bodyText: step.data.message,
            buttonText: "Select",
            sections: step.data.listSections,
          });
        }
        return { handled: true };
      }

      case "wait_for_reply": {
        if (step.data.message && _sendTextMessage) {
          await _sendTextMessage({
            workspaceId,
            accountId,
            to: contactPhone,
            text: step.data.message,
          });
        }
        return { handled: true };
      }

      case "keyword_match": {
        if (step.data.message && _sendTextMessage) {
          await _sendTextMessage({
            workspaceId,
            accountId,
            to: contactPhone,
            text: step.data.message,
          });
        }
        return { handled: true };
      }

      case "ai_reply": {
        return { handled: false, response: step.data.aiContext || undefined };
      }

      case "assign_human": {
        if (step.data.message && _sendTextMessage) {
          await _sendTextMessage({
            workspaceId,
            accountId,
            to: contactPhone,
            text: step.data.message,
          });
        }
        await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
          $set: { mode: "human" },
          $unset: { activeWorkflowId: 1, "metadata.currentStepId": 1 },
        });
        return { handled: true, response: step.data.message };
      }

      case "delay": {
        const nextId = step.connections?.[0]?.targetStepId;
        if (nextId) {
          const nextStep = allSteps.find((s) => s.id === nextId);
          if (nextStep) {
            await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
              $set: { "metadata.currentStepId": nextStep.id },
            });
            return this.executeStep({ ...params, step: nextStep });
          }
        }
        await this.endWorkflow(conversation);
        return { handled: true };
      }

      case "condition": {
        const nextId = step.connections?.[0]?.targetStepId;
        if (nextId) {
          const nextStep = allSteps.find((s) => s.id === nextId);
          if (nextStep) {
            await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
              $set: { "metadata.currentStepId": nextStep.id },
            });
            return this.executeStep({ ...params, step: nextStep });
          }
        }
        await this.endWorkflow(conversation);
        return { handled: true };
      }

      default: {
        await this.endWorkflow(conversation);
        return { handled: true };
      }
    }
  }

  private static async endWorkflow(conversation: any) {
    const previousMode = conversation.aiEnabled ? "ai" : "idle";
    await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
      $set: { mode: previousMode },
      $unset: {
        activeWorkflowId: 1,
        "metadata.currentStepId": 1,
        "metadata.workflowStartedAt": 1,
      },
    });
  }
}
