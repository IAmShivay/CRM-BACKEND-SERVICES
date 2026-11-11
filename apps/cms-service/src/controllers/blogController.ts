import { Request, Response } from "express";
import mongoose from "mongoose";
import { Blog } from "../models/Blog";
import { BlogCategory } from "../models/BlogCategory";
import { uploadFile, validateFile, ALLOWED_FILE_TYPES } from "@crm-platform/storage";
import { BLOG_IMAGE_MAX_SIZE, BLOG_RELATED_POSTS_LIMIT } from "@crm-platform/shared-types";

const RELATED_POST_FIELDS = "title slug excerpt featuredImage featuredImageAlt publishedAt readTime";

const withId = (doc: any) => (doc ? { ...doc, id: doc._id } : doc);

const blogLookup = (idOrSlug: string) =>
  mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

async function categoryMapFor(blogs: any[]) {
  const categoryIds = [...new Set(blogs.map((b) => b.categoryId).filter(Boolean))];
  const categories = await BlogCategory.find({ _id: { $in: categoryIds } }).select("name slug").lean();
  return new Map(categories.map((c: any) => [String(c._id), withId(c)]));
}

export const getBlogs = async (req: Request, res: Response) => {
  try {
    const { page, limit, category, tag, search, q, featured, status } = req.query as Record<string, any>;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const term = (search || q) as string | undefined;

    const query: Record<string, any> = {};
    if (req.user) {
      if (status) query.status = status;
    } else {
      query.status = "published";
    }

    if (category) {
      const cat = await BlogCategory.findOne({ slug: category, isActive: true });
      query.categoryId = cat ? String(cat._id) : "__none__";
    }
    if (tag) query.tags = String(tag).toLowerCase();
    if (featured === "true" || featured === true) query.isFeatured = true;
    if (term) query.$text = { $search: term };

    const skip = (pageNum - 1) * limitNum;
    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .select("-content -jsonLd")
        .sort(term ? { score: { $meta: "textScore" } } : { publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Blog.countDocuments(query),
    ]);

    const categoryMap = await categoryMapFor(blogs);
    const enriched = blogs.map((blog: any) => ({
      ...withId(blog),
      category: categoryMap.get(String(blog.categoryId)) || null,
    }));

    const totalPages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      blogs: enriched,
      total,
      totalPages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        pages: totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
};

export const getBlogById = async (req: Request, res: Response) => {
  try {
    const blog = await Blog.findById(req.params.id).lean();
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    const category = await BlogCategory.findById((blog as any).categoryId).select("name slug").lean();
    res.json({ success: true, blog: { ...withId(blog), category: withId(category) } });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch blog" });
  }
};

export const getBlogBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const filter: Record<string, any> = { slug };
    if (!req.user) filter.status = "published";

    const blog = (await Blog.findOne(filter).lean()) as any;
    if (!blog) return res.status(404).json({ message: "Blog post not found" });

    if (blog.status === "published") {
      Blog.updateOne({ slug }, { $inc: { views: 1 } }).exec();
    }

    const category = await BlogCategory.findById(blog.categoryId).select("name slug").lean();

    let relatedPosts: any[] = [];
    if (blog.relatedSlugs?.length) {
      relatedPosts = await Blog.find({ slug: { $in: blog.relatedSlugs }, status: "published" })
        .select(RELATED_POST_FIELDS)
        .lean();
    }
    if (relatedPosts.length < BLOG_RELATED_POSTS_LIMIT) {
      const more = await Blog.find({
        categoryId: blog.categoryId,
        slug: { $ne: slug, $nin: relatedPosts.map((p) => p.slug) },
        status: "published",
      })
        .select(RELATED_POST_FIELDS)
        .sort({ publishedAt: -1 })
        .limit(BLOG_RELATED_POSTS_LIMIT - relatedPosts.length)
        .lean();
      relatedPosts = [...relatedPosts, ...more];
    }

    res.json({
      success: true,
      blog: { ...withId(blog), category: withId(category) },
      relatedPosts: relatedPosts.map(withId),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch blog" });
  }
};

export const createBlog = async (req: Request, res: Response) => {
  try {
    const existing = await Blog.findOne({ slug: req.body.slug });
    if (existing) return res.status(409).json({ message: "A blog post with this slug already exists" });

    const category = await BlogCategory.findById(req.body.categoryId);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const blog = await Blog.create(req.body);
    await BlogCategory.findByIdAndUpdate(req.body.categoryId, { $inc: { postCount: 1 } });

    res.status(201).json({ success: true, blog });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create blog" });
  }
};

export const updateBlog = async (req: Request, res: Response) => {
  try {
    const blog = await Blog.findOne(blogLookup(req.params.id));
    if (!blog) return res.status(404).json({ message: "Blog post not found" });

    if (req.body.slug && req.body.slug !== blog.slug) {
      const existing = await Blog.findOne({ slug: req.body.slug });
      if (existing) return res.status(409).json({ message: "A blog post with this slug already exists" });
    }

    if (req.body.categoryId && req.body.categoryId !== blog.categoryId) {
      const category = await BlogCategory.findById(req.body.categoryId);
      if (!category) return res.status(404).json({ message: "Category not found" });
      await Promise.all([
        BlogCategory.findByIdAndUpdate(blog.categoryId, { $inc: { postCount: -1 } }),
        BlogCategory.findByIdAndUpdate(req.body.categoryId, { $inc: { postCount: 1 } }),
      ]);
    }

    Object.assign(blog, req.body);
    await blog.save();

    res.json({ success: true, blog });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update blog" });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const blog = await Blog.findOne(blogLookup(req.params.id));
    if (!blog) return res.status(404).json({ message: "Blog post not found" });

    await BlogCategory.findByIdAndUpdate(blog.categoryId, { $inc: { postCount: -1 } });
    await Blog.deleteOne({ _id: blog._id });

    res.json({ success: true, message: "Blog post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete blog" });
  }
};

export const uploadBlogImage = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const validation = validateFile({ mimetype: file.mimetype, size: file.size, name: file.originalname }, ALLOWED_FILE_TYPES.images, BLOG_IMAGE_MAX_SIZE);
    if (!validation.isValid) return res.status(400).json({ message: validation.errors[0] });

    const result = await uploadFile(file.buffer, {
      fileName: file.originalname,
      contentType: file.mimetype,
      folder: "blog",
      metadata: { uploadedBy: req.user!.userId, originalName: file.originalname },
    });

    res.json({ success: true, url: result.url, name: file.originalname, size: file.size, type: file.mimetype });
  } catch (error) {
    res.status(500).json({ message: "Upload failed" });
  }
};
