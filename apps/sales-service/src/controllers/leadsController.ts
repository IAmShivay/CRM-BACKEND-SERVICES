import { Request, Response } from "express";
import logger from "@crm-platform/logger";
import { createDealForLead } from "../services/dealAutomation";
import { checkPlanLimit } from "../services/billingClient";
import { Lead } from "../models/Lead";
import { LeadStatus } from "../models/LeadStatus";
import { LeadNote } from "../models/LeadNote";
import { Tag } from "../models/Tag";
import { Contact } from "../models/Contact";
import { Activity } from "../models/Activity";

export const getLeads = async (req: Request, res: Response) => {
  try {
    const {
      workspaceId,
      status,
      assignedTo,
      source,
      priority,
      search,
      tags,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      limit = "20",
    } = req.query;

    const filter: any = { workspaceId };
    if (status) filter.statusId = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (source) filter.source = source;
    if (priority) filter.priority = priority;

    if (tags) {
      const tagIds = (tags as string).split(",").filter(Boolean);
      if (tagIds.length > 0) filter.tagIds = { $in: tagIds };
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      filter.$text = { $search: search as string };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortMap: Record<string, any> = {
      createdAt: { createdAt: sortOrder === "asc" ? 1 : -1 },
      name: { name: sortOrder === "asc" ? 1 : -1 },
      value: { value: sortOrder === "asc" ? 1 : -1 },
      priority: { priority: sortOrder === "asc" ? 1 : -1 },
      nextFollowUpAt: { nextFollowUpAt: sortOrder === "asc" ? 1 : -1 },
    };
    const sortOption = search
      ? { score: { $meta: "textScore" } }
      : sortMap[sortBy as string] || { createdAt: -1 };

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .select(
          "name email phone company status statusId source value assignedTo tagIds priority createdBy createdAt nextFollowUpAt notes customData leadScore leadScoreFactors"
        )
        .populate("statusId", "name color")
        .populate("tagIds", "name color")
        .populate("assignedTo", "fullName email")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    res.json({
      success: true,
      leads: leads.map((lead: any) => ({
        ...lead,
        id: lead._id,
        tagIds: (lead.tagIds || []).map((tag: any) =>
          typeof tag === "object"
            ? { ...tag, id: tag._id?.toString() || tag._id }
            : tag
        ),
        statusId:
          typeof lead.statusId === "object" && lead.statusId
            ? {
                ...lead.statusId,
                id: lead.statusId._id?.toString() || lead.statusId._id,
              }
            : lead.statusId || null,
        assignedTo:
          typeof lead.assignedTo === "object" && lead.assignedTo
            ? {
                ...lead.assignedTo,
                id: lead.assignedTo._id?.toString() || lead.assignedTo._id,
              }
            : lead.assignedTo || null,
        createdBy: lead.createdBy || null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch leads" });
  }
};

export const getLeadById = async (req: Request, res: Response) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("statusId", "name color")
      .populate("tagIds", "name color")
      .populate("assignedTo", "fullName email");
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch lead" });
  }
};

export const createLead = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;

    const limit = await checkPlanLimit(String(workspaceId), "leads");
    if (!limit.allowed) {
      return res.status(403).json({ message: limit.message, code: limit.code, limit: limit.limit, current: limit.used });
    }

    const defaultStatus = await LeadStatus.findOne({
      workspaceId,
      isDefault: true,
    }).lean();

    const defaultTag = await Tag.findOne({
      workspaceId,
      name: "Cold Lead",
    }).lean();

    const leadData = {
      ...req.body,
      status: (defaultStatus as any)?.name || "New",
      statusId: req.body.statusId || (defaultStatus as any)?._id?.toString(),
      tagIds: req.body.tagIds?.length
        ? req.body.tagIds
        : defaultTag
          ? [(defaultTag as any)._id.toString()]
          : [],
      source: req.body.source || "manual",
      priority: req.body.priority || "medium",
      createdBy: req.body.createdBy || (req as any).user?.userId,
      leadScore: 0,
      leadScoreFactors: [],
    };

    const lead = await Lead.create(leadData);
    createDealForLead(lead).catch((err) => logger.warn("Auto-create deal failed", { leadId: lead._id, error: err?.message }));

    const populatedLead = await Lead.findById(lead._id)
      .populate("tagIds", "name color")
      .populate("statusId", "name color")
      .populate("assignedTo", "fullName email");

    res.status(201).json({ success: true, lead: populatedLead });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create lead" });
  }
};

export const updateLead = async (req: Request, res: Response) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate("statusId", "name color")
      .populate("tagIds", "name color")
      .populate("assignedTo", "fullName email");
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json({ success: true, lead });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update lead" });
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json({ success: true, message: "Lead deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete lead" });
  }
};

export const bulkDeleteLeads = async (req: Request, res: Response) => {
  try {
    const { ids, workspaceId } = req.body;
    const result = await Lead.deleteMany({ _id: { $in: ids }, workspaceId });
    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} lead(s) deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to bulk delete leads" });
  }
};

export const bulkUpdateLeads = async (req: Request, res: Response) => {
  try {
    const { leadIds, workspaceId, updates } = req.body;

    const result = await Lead.updateMany(
      { _id: { $in: leadIds }, workspaceId },
      { $set: updates }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `Updated ${result.modifiedCount} leads`,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to bulk update leads" });
  }
};

export const convertLeadToContact = async (req: Request, res: Response) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("statusId", "name color")
      .populate("tagIds", "name color")
      .populate("assignedTo", "fullName email");
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const existingContact = await Contact.findOne({ originalLeadId: req.params.id });
    if (existingContact) {
      return res.status(400).json({
        message: "Lead has already been converted to a contact",
        contact: existingContact,
      });
    }

    const contactData = {
      workspaceId: lead.workspaceId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      originalLeadId: req.params.id,
      convertedFromLead: true,
      leadConversionDate: new Date(),
      tagIds: lead.tagIds,
      assignedTo: lead.assignedTo,
      priority: lead.priority,
      notes: lead.notes,
      customData: lead.customData || {},
      category: "prospect",
      status: "active",
      createdBy: req.body.createdBy || (req as any).user?.userId || lead.createdBy,
    };

    const contact = await Contact.create(contactData);

    const populatedContact = await Contact.findById(contact._id)
      .populate("tagIds", "name color")
      .populate("assignedTo", "fullName email");

    await Lead.findByIdAndUpdate(req.params.id, {
      status: "converted",
      convertedToContactId: contact._id,
      convertedAt: new Date(),
    });

    try {
      await Activity.create({
        workspaceId: lead.workspaceId,
        performedBy: (req as any).user?.userId || lead.createdBy,
        activityType: "converted",
        entityType: "lead",
        entityId: req.params.id,
        description: `Lead "${lead.name}" converted to contact`,
        metadata: {
          leadName: lead.name,
          contactId: contact._id,
          conversionDate: new Date(),
        },
      });
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: "Lead successfully converted to contact",
      contact: populatedContact,
      leadId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to convert lead" });
  }
};

export const getLeadNotes = async (req: Request, res: Response) => {
  try {
    const { id: leadId } = req.params;
    const { page = "1", limit = "20" } = req.query;

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const userId = (req as any).user?.userId;

    const query: any = {
      leadId,
      $or: [
        { isPrivate: false },
        { isPrivate: true, createdBy: userId },
      ],
    };

    const [notes, total] = await Promise.all([
      LeadNote.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("createdBy", "fullName email"),
      LeadNote.countDocuments(query),
    ]);

    res.json({
      success: true,
      notes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notes" });
  }
};

export const addLeadNote = async (req: Request, res: Response) => {
  try {
    const { id: leadId } = req.params;
    const { content, type, isPrivate } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const note = await LeadNote.create({
      leadId,
      workspaceId: lead.workspaceId,
      content,
      type: type || "note",
      isPrivate: isPrivate || false,
      createdBy: (req as any).user?.userId || req.body.createdBy,
    });

    if (type && ["call", "email", "meeting"].includes(type)) {
      await Lead.findByIdAndUpdate(leadId, { lastContactedAt: new Date() });
    }

    const populatedNote = await LeadNote.findById(note._id).populate(
      "createdBy",
      "fullName email"
    );

    res.status(201).json({ success: true, note: populatedNote });
  } catch (error) {
    res.status(500).json({ message: "Failed to create note" });
  }
};

export const getLeadActivities = async (req: Request, res: Response) => {
  try {
    const { id: leadId } = req.params;
    const { limit = "50" } = req.query;

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const limitNum = parseInt(limit as string, 10);

    const activities = await Activity.find({
      entityType: "lead",
      entityId: leadId,
    })
      .sort({ createdAt: -1 })
      .limit(limitNum);

    res.json({ success: true, activities });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activities" });
  }
};

export const addLeadActivity = async (req: Request, res: Response) => {
  try {
    const { id: leadId } = req.params;
    const { workspaceId } = req.query;
    const { activityType, description, metadata } = req.body;

    const activity = await Activity.create({
      workspaceId,
      entityType: "lead",
      entityId: leadId,
      activityType,
      description,
      metadata: metadata || {},
      performedBy: (req as any).user?.userId || req.body.performedBy,
    });

    res.status(201).json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ message: "Failed to create activity" });
  }
};
