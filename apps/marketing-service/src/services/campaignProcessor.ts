import mongoose from "mongoose";
import logger from "@crm-platform/logger";
import { Campaign, CampaignEnrollment } from "../models/Campaign";
import { EmailSequence, SequenceEnrollment } from "../models/EmailSequence";
import { SmsLog } from "../models/SmsLog";
import { sendWhatsApp } from "./whatsappClient";
import { sendEmail } from "./emailSender";
import { generateReply } from "../controllers/aiController";

type Source = "campaign" | "sequence";

interface Step {
  order: number;
  channel: "email" | "whatsapp" | "sms" | "ai_reply";
  subject?: string;
  body: string;
  delayDays: number;
  delayHours: number;
  aiTone?: string;
  aiContext?: string;
  replyViaChannel?: "email" | "whatsapp" | "sms";
}

interface Enrollment {
  _id: any;
  workspaceId: string;
  email?: string;
  phone?: string;
  leadId?: string;
  contactId?: string;
  currentStep: number;
}

async function findActiveWhatsAppAccount(workspaceId: string) {
  return mongoose.connection.db!.collection("whatsappaccounts").findOne({ workspaceId, isActive: true }, { sort: { createdAt: 1 } });
}

async function findApprovedTemplate(workspaceId: string, name: string) {
  return mongoose.connection.db!.collection("whatsapptemplates").findOne({ workspaceId, name, status: "APPROVED", isActive: true });
}

async function sendViaWhatsApp(enrollment: Enrollment, text: string, source: Source): Promise<boolean> {
  const account = await findActiveWhatsAppAccount(enrollment.workspaceId);
  if (!account) {
    logger.warn(`${source}: no active WhatsApp account`, { workspaceId: enrollment.workspaceId });
    return false;
  }

  const template = await findApprovedTemplate(enrollment.workspaceId, text);
  const result = await sendWhatsApp({
    workspaceId: enrollment.workspaceId,
    accountId: account._id.toString(),
    to: enrollment.phone!,
    ...(template ? { templateName: text, language: template.language } : { text }),
    contactId: enrollment.contactId,
    leadId: enrollment.leadId,
    source,
  });

  if (!result.success) logger.warn(`${source}: WhatsApp send failed`, { phone: enrollment.phone, error: result.error });
  return result.success;
}

async function sendViaSms(enrollment: Enrollment, message: string): Promise<boolean> {
  await SmsLog.create({
    workspaceId: enrollment.workspaceId,
    to: enrollment.phone,
    message,
    type: "marketing",
    status: "pending",
    provider: process.env.SMS_PROVIDER || "msg91",
    sentBy: "system",
    entityType: enrollment.leadId ? "lead" : enrollment.contactId ? "contact" : undefined,
    entityId: enrollment.leadId || enrollment.contactId,
    sentAt: new Date(),
  });
  return true;
}

async function sendViaEmail(enrollment: Enrollment, subject: string, html: string, source: Source): Promise<boolean> {
  try {
    await sendEmail({ to: enrollment.email!, subject, html });
    return true;
  } catch (err: any) {
    logger.warn(`${source}: email send failed`, { email: enrollment.email, error: err.message });
    return false;
  }
}

async function executeStep(step: Step, enrollment: Enrollment, source: Source): Promise<boolean> {
  const channel = step.channel || "email";

  if (channel === "email" && enrollment.email) {
    return sendViaEmail(enrollment, step.subject || `${source === "campaign" ? "Campaign" : "Sequence"} Message`, step.body, source);
  }
  if (channel === "whatsapp" && enrollment.phone) {
    return sendViaWhatsApp(enrollment, step.body, source);
  }
  if (channel === "sms" && enrollment.phone) {
    return sendViaSms(enrollment, step.body);
  }
  if (channel === "ai_reply") {
    const replyChannel = step.replyViaChannel || "whatsapp";
    if ((replyChannel === "email" && !enrollment.email) || (replyChannel !== "email" && !enrollment.phone)) return false;

    let reply: string;
    try {
      reply = (await generateReply({
        channel: replyChannel,
        incomingMessage: step.body,
        tone: step.aiTone || "professional",
        businessContext: step.aiContext || "",
      })).reply;
    } catch (err: any) {
      logger.warn(`${source}: AI reply generation failed`, { error: err.message });
      return false;
    }

    if (replyChannel === "whatsapp") return sendViaWhatsApp(enrollment, reply, source);
    if (replyChannel === "sms") return sendViaSms(enrollment, reply);
    return sendViaEmail(enrollment, step.subject || "A message for you", reply, source);
  }

  return false;
}

async function advance(model: any, enrollment: Enrollment, steps: Step[], now: Date, onComplete: () => Promise<void>) {
  const nextIndex = enrollment.currentStep + 1;
  if (nextIndex >= steps.length) {
    await model.findByIdAndUpdate(enrollment._id, { $set: { status: "completed", completedAt: now } });
    await onComplete();
    return;
  }
  const next = steps[nextIndex];
  const delayMs = (next.delayDays || 0) * 86400000 + (next.delayHours || 0) * 3600000;
  await model.findByIdAndUpdate(enrollment._id, { $set: { currentStep: nextIndex, nextSendAt: new Date(now.getTime() + delayMs) } });
}

export async function processDueCampaigns(limit = 50) {
  const now = new Date();
  const due = await CampaignEnrollment.find({ status: "active", nextSendAt: { $lte: now } }).limit(limit);
  let processed = 0;

  for (const enrollment of due) {
    try {
      const campaign = await Campaign.findById(enrollment.campaignId);
      if (!campaign || campaign.status !== "active") {
        await CampaignEnrollment.findByIdAndUpdate(enrollment._id, { $set: { status: "paused" } });
        continue;
      }

      const steps = [...campaign.steps].sort((a: any, b: any) => a.order - b.order) as Step[];
      const step = steps[enrollment.currentStep];
      const complete = () => Campaign.findByIdAndUpdate(campaign._id, { $inc: { completedCount: 1 } }).then(() => undefined);

      if (!step) {
        await CampaignEnrollment.findByIdAndUpdate(enrollment._id, { $set: { status: "completed", completedAt: now } });
        await complete();
        continue;
      }

      const sent = await executeStep(step, enrollment as any, "campaign");
      if (sent) {
        await advance(CampaignEnrollment, enrollment as any, steps, now, complete);
        processed++;
      } else {
        await CampaignEnrollment.findByIdAndUpdate(enrollment._id, { $set: { nextSendAt: new Date(now.getTime() + 3600000) } });
      }
    } catch (err: any) {
      logger.error("Campaign enrollment error", { error: err.message, enrollmentId: enrollment._id });
    }
  }

  return { found: due.length, processed };
}

export async function processDueSequences(limit = 50) {
  const now = new Date();
  const due = await SequenceEnrollment.find({ status: "active", nextSendAt: { $lte: now } }).limit(limit);
  let processed = 0;

  for (const enrollment of due) {
    try {
      const sequence = await EmailSequence.findById(enrollment.sequenceId);
      if (!sequence || sequence.status !== "active") {
        await SequenceEnrollment.findByIdAndUpdate(enrollment._id, { $set: { status: "paused" } });
        continue;
      }

      const steps = [...sequence.steps].sort((a: any, b: any) => a.order - b.order) as Step[];
      const step = steps[enrollment.currentStep];
      const complete = () => EmailSequence.findByIdAndUpdate(sequence._id, { $inc: { completedCount: 1 } }).then(() => undefined);

      if (!step) {
        await SequenceEnrollment.findByIdAndUpdate(enrollment._id, { $set: { status: "completed", completedAt: now } });
        await complete();
        continue;
      }

      const sent = await executeStep(step, enrollment as any, "sequence");
      if (sent) {
        await advance(SequenceEnrollment, enrollment as any, steps, now, complete);
        processed++;
      } else {
        await SequenceEnrollment.findByIdAndUpdate(enrollment._id, { $set: { nextSendAt: new Date(now.getTime() + 3600000) } });
      }
    } catch (err: any) {
      logger.error("Sequence enrollment error", { error: err.message, enrollmentId: enrollment._id });
    }
  }

  return { found: due.length, processed };
}

let running = false;

export async function runProcessors() {
  if (running) return;
  running = true;
  try {
    const [campaigns, sequences] = await Promise.all([processDueCampaigns(), processDueSequences()]);
    if (campaigns.found || sequences.found) {
      logger.info("Campaign/sequence processing complete", { campaigns, sequences });
    }
  } catch (err: any) {
    logger.error("Processor run failed", { error: err.message });
  } finally {
    running = false;
  }
}
