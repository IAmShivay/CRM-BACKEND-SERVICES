import { Request, Response } from "express";
import { SocialPost } from "../models/SocialPost";

export const getPosts = async (req: Request, res: Response) => {
  try {
    const { workspaceId, status, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (status) filter.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      SocialPost.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      SocialPost.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      posts,
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
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

export const getPostById = async (req: Request, res: Response) => {
  try {
    const post = await SocialPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch post" });
  }
};

export const createPost = async (req: Request, res: Response) => {
  try {
    const post = await SocialPost.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, post });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create post" });
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    const post = await SocialPost.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ success: true, post });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update post" });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const post = await SocialPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ success: true, message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete post" });
  }
};
