import { Request, Response } from "express";
import mongoose from "mongoose";
import { Contact } from "../models/Contact";

if (!mongoose.models.Tag) {
  mongoose.model("Tag", new mongoose.Schema({ name: String, color: String }, { collection: "tags" }));
}
if (!mongoose.models.User) {
  mongoose.model("User", new mongoose.Schema({ fullName: String, email: String, avatarUrl: String }, { collection: "users" }));
}

export const getContacts = async (req: Request, res: Response) => {
  try {
    const { workspaceId, status, category, search, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    if (search) {
      filter.$text = { $search: search as string };
    }

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .populate("tagIds", "name color")
        .populate("assignedTo", "fullName email")
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Contact.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      contacts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages,
        hasNext: pageNum < pages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
};

export const getContactById = async (req: Request, res: Response) => {
  try {
    const contact = await Contact.findById(req.params.id).populate('tagIds assignedTo createdBy');
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json({ success: true, contact });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch contact" });
  }
};

export const createContact = async (req: Request, res: Response) => {
  try {
    const contact = await Contact.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, contact });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create contact" });
  }
};

export const updateContact = async (req: Request, res: Response) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json({ success: true, contact });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update contact" });
  }
};

export const deleteContact = async (req: Request, res: Response) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json({ success: true, message: "Contact deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete contact" });
  }
};
