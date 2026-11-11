import mongoose, { Document, Schema } from "mongoose";
import {
  BLOG_STATUSES,
  BLOG_CHANGE_FREQUENCIES,
  BLOG_SLUG_PATTERN,
  BLOG_WORDS_PER_MINUTE,
} from "@crm-platform/shared-types";

export interface IBlog extends Omit<Document, "_id"> {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  featuredImageAlt: string;
  categoryId: string;
  tags: string[];
  author: { name: string; avatar: string; bio: string };
  status: (typeof BLOG_STATUSES)[number];
  publishedAt: Date | null;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  readTime: number;
  wordCount: number;
  jsonLd: Record<string, unknown>;
  priority: number;
  changeFrequency: (typeof BLOG_CHANGE_FREQUENCIES)[number];
  views: number;
  isFeatured: boolean;
  relatedSlugs: string[];
  tableOfContents: { id: string; text: string; level: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, match: BLOG_SLUG_PATTERN },
    content: { type: String, required: true },
    excerpt: { type: String, default: "", maxlength: 300 },
    featuredImage: { type: String, default: "" },
    featuredImageAlt: { type: String, default: "", maxlength: 200 },
    categoryId: { type: String, ref: "BlogCategory", required: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    author: {
      name: { type: String, required: true },
      avatar: { type: String, default: "" },
      bio: { type: String, default: "" },
    },
    status: { type: String, enum: [...BLOG_STATUSES], default: "draft" },
    publishedAt: { type: Date, default: null },
    metaTitle: { type: String, default: "", maxlength: 70 },
    metaDescription: { type: String, default: "", maxlength: 160 },
    metaKeywords: [{ type: String, trim: true, lowercase: true }],
    canonicalUrl: { type: String, default: "" },
    ogTitle: { type: String, default: "", maxlength: 70 },
    ogDescription: { type: String, default: "", maxlength: 200 },
    ogImage: { type: String, default: "" },
    twitterTitle: { type: String, default: "", maxlength: 70 },
    twitterDescription: { type: String, default: "", maxlength: 200 },
    twitterImage: { type: String, default: "" },
    readTime: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    jsonLd: { type: Schema.Types.Mixed, default: {} },
    priority: { type: Number, default: 0.7, min: 0, max: 1 },
    changeFrequency: { type: String, enum: [...BLOG_CHANGE_FREQUENCIES], default: "weekly" },
    views: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    relatedSlugs: [{ type: String, trim: true }],
    tableOfContents: [
      {
        id: { type: String },
        text: { type: String },
        level: { type: Number },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

BlogSchema.pre("save", function (next) {
  if (this.isModified("content")) {
    const words = this.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean);
    this.wordCount = words.length;
    this.readTime = Math.max(1, Math.ceil(words.length / BLOG_WORDS_PER_MINUTE));
  }
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

BlogSchema.index({ status: 1, publishedAt: -1 });
BlogSchema.index({ categoryId: 1, status: 1 });
BlogSchema.index({ tags: 1 });
BlogSchema.index({ isFeatured: 1, status: 1 });
BlogSchema.index({ status: 1, views: -1 });
BlogSchema.index({ title: "text", excerpt: "text", tags: "text" });

export const Blog =
  mongoose.models?.Blog || mongoose.model<IBlog>("Blog", BlogSchema);
