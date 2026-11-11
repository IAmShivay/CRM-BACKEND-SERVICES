import { Request, Response } from "express";
import mongoose from "mongoose";
import { CollabDocument } from "../models/Document";
import { DocumentVersion } from "../models/DocumentVersion";

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const { workspaceId, folderId, search, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (folderId) filter.folderId = folderId;
    if (search) filter.$text = { $search: search as string };

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [documents, total] = await Promise.all([
      CollabDocument.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("title folderId createdBy sharedWith version createdAt updatedAt"),
      CollabDocument.countDocuments(filter),
    ]);

    res.json({
      success: true,
      documents,
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
    res.status(500).json({ message: "Failed to fetch documents" });
  }
};

export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const doc = await CollabDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch document" });
  }
};

export const createDocument = async (req: Request, res: Response) => {
  try {
    const doc = await CollabDocument.create({
      ...req.body,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, document: doc });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create document" });
  }
};

export const updateDocument = async (req: Request, res: Response) => {
  try {
    const current = await CollabDocument.findById(req.params.id);
    if (!current) return res.status(404).json({ message: "Document not found" });
    const { title, content, folderId } = req.body;
    const changed = (title !== undefined && title !== current.title) || (content !== undefined && content !== current.content);
    if (changed) {
      await DocumentVersion.create({
        workspaceId: current.workspaceId,
        documentId: current._id.toString(),
        version: current.version || 1,
        title: current.title,
        content: current.content,
        createdBy: req.user!.userId,
      });
    }
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (folderId !== undefined) updates.folderId = folderId;
    const doc = await CollabDocument.findByIdAndUpdate(
      req.params.id,
      { $set: updates, ...(changed ? { $inc: { version: 1 } } : {}) },
      { new: true, runValidators: true }
    );
    res.json({ success: true, document: doc });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update document" });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const doc = await CollabDocument.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json({ success: true, message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete document" });
  }
};

export const shareDocument = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;
    const doc = await CollabDocument.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { sharedWith: { $each: userIds } } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ message: "Failed to share document" });
  }
};

export const getPublicDocument = async (req: Request, res: Response) => {
  try {
    const document = await CollabDocument.findById(req.params.id);
    if (!document) return res.status(404).json({ message: "Document not found" });
    res.json({
      success: true,
      document: {
        id: document._id.toString(),
        title: document.title,
        content: document.content,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch document" });
  }
};

async function lookupAuthors(ids: string[]) {
  const ObjectId = mongoose.Types.ObjectId;
  const unique = Array.from(new Set(ids.filter((i) => ObjectId.isValid(i))));
  if (!unique.length) return new Map<string, any>();
  const rows = await mongoose.connection.db!.collection("users").find({ _id: { $in: unique.map((i) => new ObjectId(i)) } }, { projection: { fullName: 1, email: 1 } }).toArray();
  return new Map(rows.map((u: any) => [u._id.toString(), { id: u._id.toString(), fullName: u.fullName, email: u.email }]));
}

export const getDocumentVersions = async (req: Request, res: Response) => {
  try {
    const document = await CollabDocument.findById(req.params.id).lean();
    if (!document) return res.status(404).json({ message: "Document not found" });
    const versions = await DocumentVersion.find({ documentId: req.params.id }).sort({ version: -1 }).limit(50).lean();
    const authors = await lookupAuthors(versions.map((v: any) => v.createdBy));
    res.json({
      success: true,
      versions: versions.map((v: any) => ({ id: v._id.toString(), version: v.version, title: v.title, createdBy: authors.get(v.createdBy), createdAt: v.createdAt })),
      currentVersion: (document as any).version || 1,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch versions" });
  }
};

export const restoreDocumentVersion = async (req: Request, res: Response) => {
  try {
    const { versionId } = req.body;
    const document = await CollabDocument.findById(req.params.id);
    if (!document) return res.status(404).json({ message: "Document not found" });
    const target = await DocumentVersion.findOne({ _id: versionId, documentId: req.params.id });
    if (!target) return res.status(404).json({ message: "Version not found" });

    await DocumentVersion.create({
      workspaceId: document.workspaceId,
      documentId: document._id.toString(),
      version: document.version || 1,
      title: document.title,
      content: document.content,
      createdBy: req.user!.userId,
    });
    const newVersion = (document.version || 1) + 1;
    await CollabDocument.updateOne({ _id: document._id }, { $set: { title: target.title, content: target.content, version: newVersion } });
    res.json({ success: true, message: `Restored to version ${target.version}`, newVersion });
  } catch (error) {
    res.status(500).json({ message: "Failed to restore version" });
  }
};
