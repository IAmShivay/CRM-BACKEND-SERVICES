import { Request, Response } from "express";
import mongoose from "mongoose";
import { formatPhone } from "@crm-platform/shared-types";
import { WhatsAppConversation } from "../models/WhatsAppConversation";
import { WhatsAppMessage } from "../models/WhatsAppMessage";

function phoneVariants(phone: string) {
  const normalized = formatPhone(phone);
  return Array.from(new Set([phone, normalized, `+${normalized}`]));
}

export const getConversations = async (req: Request, res: Response) => {
  try {
    const { workspaceId, accountId, status, mode, phone, page = "1", limit = "50" } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    if (phone) {
      const variants = phoneVariants(phone as string);
      const filter = { workspaceId, $or: [{ from: { $in: variants } }, { to: { $in: variants } }] };

      const [messages, total, state] = await Promise.all([
        WhatsAppMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        WhatsAppMessage.countDocuments(filter),
        WhatsAppConversation.findOne({ workspaceId, contactPhone: { $in: variants } }),
      ]);

      if (state && state.unreadCount > 0) {
        await Promise.all([
          WhatsAppConversation.findByIdAndUpdate(state._id, { unreadCount: 0 }),
          WhatsAppMessage.updateMany({ ...filter, direction: "inbound", isRead: false }, { isRead: true, readAt: new Date() }),
        ]);
      }

      const pages = Math.ceil(total / limitNum);
      return res.json({
        success: true,
        messages: messages.reverse(),
        state,
        total,
        hasMore: skip + messages.length < total,
        pagination: { page: pageNum, limit: limitNum, total, pages, hasNext: pageNum < pages, hasPrev: pageNum > 1 },
      });
    }

    const stateFilter: any = { workspaceId };
    if (accountId) stateFilter.accountId = accountId;
    if (status) stateFilter.status = status;
    if (mode) stateFilter.mode = mode;

    const [grouped, states] = await Promise.all([
      WhatsAppMessage.aggregate([
        { $match: { workspaceId } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: { $cond: [{ $eq: ["$direction", "inbound"] }, "$from", "$to"] },
            accountId: { $first: "$accountId" },
            lastMessage: { $first: "$content" },
            lastMessageAt: { $first: "$createdAt" },
            messageCount: { $sum: 1 },
            unreadCount: {
              $sum: { $cond: [{ $and: [{ $eq: ["$direction", "inbound"] }, { $eq: ["$isRead", false] }] }, 1, 0] },
            },
          },
        },
        { $sort: { lastMessageAt: -1 } },
      ]),
      WhatsAppConversation.find(stateFilter).lean(),
    ]);

    const stateByPhone = new Map<string, any>();
    for (const s of states) stateByPhone.set(formatPhone(s.contactPhone), s);

    const hasStateFilter = Boolean(accountId || status || mode);
    const conversations = grouped
      .map((g) => {
        const state = stateByPhone.get(formatPhone(g._id));
        if (hasStateFilter && !state) return null;
        return {
          id: state?._id?.toString() || g._id,
          workspaceId,
          contactPhone: state?.contactPhone || g._id,
          accountId: state?.accountId || g.accountId,
          contactName: state?.contactName || null,
          lastMessage: g.lastMessage,
          lastMessageAt: g.lastMessageAt,
          messageCount: g.messageCount,
          unreadCount: state?.unreadCount ?? g.unreadCount,
          status: state?.status || "active",
          mode: state?.mode || "idle",
          humanAssignedTo: state?.humanAssignedTo || null,
          createdAt: state?.createdAt,
          updatedAt: state?.updatedAt,
        };
      })
      .filter(Boolean);

    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

export const getConversationById = async (req: Request, res: Response) => {
  try {
    const conversation = await WhatsAppConversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
};

export const updateConversation = async (req: Request, res: Response) => {
  try {
    const { mode, status, aiEnabled, contactName } = req.body;
    const updates: Record<string, unknown> = {};
    if (mode) {
      updates.mode = mode;
      if (mode !== "human") updates.humanAssignedTo = null;
    }
    if (status) updates.status = status;
    if (typeof aiEnabled === "boolean") updates.aiEnabled = aiEnabled;
    if (contactName !== undefined) updates.contactName = contactName;

    const conversation = await WhatsAppConversation.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    res.json({ success: true, conversation });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update conversation" });
  }
};

export const handoffConversation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, assignedTo, workspaceId } = req.body;

    const conversation = mongoose.isValidObjectId(id)
      ? await WhatsAppConversation.findById(id)
      : await WhatsAppConversation.findOne({ workspaceId, contactPhone: { $in: phoneVariants(id) } });
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    if (action === "take_over") {
      conversation.mode = "human";
      conversation.humanAssignedTo = assignedTo || req.user!.userId;
    } else {
      conversation.mode = conversation.aiEnabled ? "ai" : "idle";
      conversation.humanAssignedTo = undefined;
    }
    await conversation.save();

    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ message: "Failed to handoff conversation" });
  }
};
