import { Request, Response } from "express";
import { BlogCategory } from "../models/BlogCategory";
import { Blog } from "../models/Blog";

const withId = (doc: any) => (doc ? { ...doc, id: doc._id } : doc);

export const getCategories = async (req: Request, res: Response) => {
  try {
    const filter = req.user ? {} : { isActive: true };
    const categories = await BlogCategory.find(filter).sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, categories: categories.map(withId) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const category = await BlogCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch category" });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const existing = await BlogCategory.findOne({ slug: req.body.slug });
    if (existing) return res.status(409).json({ message: "A category with this slug already exists" });

    const category = await BlogCategory.create(req.body);
    res.status(201).json({ success: true, category });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create category" });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    if (req.body.slug) {
      const existing = await BlogCategory.findOne({ slug: req.body.slug, _id: { $ne: req.params.id } });
      if (existing) return res.status(409).json({ message: "A category with this slug already exists" });
    }
    const category = await BlogCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ success: true, category });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update category" });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const blogCount = await Blog.countDocuments({ categoryId: req.params.id });
    if (blogCount > 0) {
      return res.status(400).json({ message: `Cannot delete: ${blogCount} blog post(s) use this category. Reassign them first.` });
    }
    const category = await BlogCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category" });
  }
};
