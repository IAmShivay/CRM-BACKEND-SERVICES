import { Request, Response } from "express";
import { OPENROUTER_API_URL, OPENROUTER_DEFAULT_MODEL } from "@crm-platform/shared-types";
import logger from "@crm-platform/logger";

export interface AutoReplyInput {
  channel: "whatsapp" | "sms" | "email";
  incomingMessage: string;
  senderName?: string;
  businessName?: string;
  tone: string;
  businessContext?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function generateReply(input: AutoReplyInput): Promise<{ reply: string; model: string }> {
  const apiKey = process.env.PLATFORM_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("AI service not configured");

  const business = input.businessName || "our company";
  const sender = input.senderName || "a customer";
  const maxChars = input.channel === "email" ? 500 : 200;
  const contextSection = input.businessContext ? `\n\nBusiness Information:\n${input.businessContext}` : "";

  const systemPrompt = `You are a customer support agent for ${business}.${contextSection}

Tone: ${input.tone}
Channel: ${input.channel}

Reply rules:
- Stay within ${maxChars} characters for ${input.channel} (email: longer ok, whatsapp/sms: keep under 200 chars)
- Answer based on the business information provided
- If you don't know the answer, say you'll follow up
- Do NOT make up prices, policies, or facts not in the business context
- Reply to this ${input.channel} message from ${sender}
- Do not mention that you are an AI
- Reply only with the message text — no subject line, no formatting, no preamble`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "ClearCRM Auto-Reply",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...(input.conversationHistory || []),
        { role: "user", content: input.incomingMessage },
      ],
      max_tokens: input.channel === "email" ? 400 : 200,
      temperature: 0.7,
    }),
  });

  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "AI generation failed");

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("No reply generated");

  return { reply, model: data.model };
}

export const generateAutoReply = async (req: Request, res: Response) => {
  try {
    const {
      channel = "whatsapp",
      incomingMessage,
      originalMessage,
      senderName,
      businessName,
      tone = "professional",
      businessContext,
      context,
      conversationHistory,
    } = req.body;

    const result = await generateReply({
      channel,
      incomingMessage: incomingMessage || originalMessage,
      senderName,
      businessName,
      tone,
      businessContext: businessContext || context,
      conversationHistory,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.error("Auto-reply generation failed", { error: error.message });
    const status = error.message === "AI service not configured" ? 503 : 502;
    res.status(status).json({ message: error.message || "Failed to generate auto-reply" });
  }
};

export const generateEmail = async (req: Request, res: Response) => {
  try {
    const { purpose, recipientName, senderName, tone = "professional", keyPoints = [] } = req.body;

    const pointsList = keyPoints.length > 0
      ? keyPoints.map((p: string) => `- ${p}`).join("\n")
      : "";

    const emailBody = `Dear ${recipientName || "there"},

I hope this message finds you well.

${purpose ? `I am writing to ${purpose}.` : ""}
${pointsList ? `\nKey points:\n${pointsList}\n` : ""}
Please feel free to reach out if you have any questions.

Best regards,
${senderName || "Team"}`;

    res.json({
      success: true,
      email: {
        subject: purpose ? `Regarding: ${purpose}` : "Follow-up",
        body: emailBody,
      },
      metadata: {
        tone,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate email" });
  }
};

export const suggestSubjectLine = async (req: Request, res: Response) => {
  try {
    const { body, purpose } = req.body;

    const suggestions = [
      purpose ? `Re: ${purpose}` : "Follow-up on our conversation",
      "Quick update for you",
      "Important information enclosed",
    ];

    res.json({ success: true, suggestions });
  } catch (error) {
    res.status(500).json({ message: "Failed to suggest subject lines" });
  }
};
