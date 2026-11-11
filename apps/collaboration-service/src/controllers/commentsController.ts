import { Request, Response } from "express";
import { Comment } from "../models/Comment";

export const getComments = async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, workspaceId } = req.query;

    const filter: any = { isDeleted: false };
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (workspaceId) filter.workspaceId = workspaceId;

    const comments = await Comment.find(filter)
      .populate("createdBy", "fullName email avatarUrl")
      .populate("parentId")
      .sort({ createdAt: -1 });

    res.json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const { content, entityType, entityId, parentId, workspaceId } = req.body;

    const comment = await Comment.create({
      content,
      entityType,
      entityId,
      parentId: parentId || null,
      workspaceId,
      createdBy: (req as any).user?.userId,
    });

    const populated = await comment.populate(
      "createdBy",
      "fullName email avatarUrl"
    );

    res.status(201).json({ success: true, comment: populated });
  } catch (error) {
    res.status(500).json({ message: "Failed to create comment" });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(id);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: "Comment not found" });
    }

    comment.editHistory.push({
      content: comment.content,
      editedBy: (req as any).user?.userId,
      editedAt: new Date(),
    });
    comment.content = content;
    await comment.save();

    const populated = await comment.populate(
      "createdBy",
      "fullName email avatarUrl"
    );

    res.json({ success: true, comment: populated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update comment" });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: "Comment not found" });
    }

    comment.isDeleted = true;
    await comment.save();

    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete comment" });
  }
};

export const getCommentHistory = async (req: Request, res: Response) => {
  try {
    const comment: any = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const history = comment.editHistory || [];
    res.json({
      success: true,
      commentId: comment._id,
      versions: [
        ...history.map((h: any, i: number) => ({ version: i + 1, content: h.content, editedBy: h.editedBy, editedAt: h.editedAt })),
        { version: history.length + 1, content: comment.content, editedBy: comment.createdBy, editedAt: comment.updatedAt, current: true },
      ],
      totalEdits: history.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch comment history" });
  }
};
