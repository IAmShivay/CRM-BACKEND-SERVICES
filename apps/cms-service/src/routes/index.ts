import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import { optionalAuth } from "../middleware/optionalAuth";
import {
  workspaceIdSchema,
  paginationSchema,
  searchSchema,
  BLOG_IMAGE_MAX_SIZE,
  BLOG_STATUSES,
  BLOG_CHANGE_FREQUENCIES,
  BLOG_SLUG_PATTERN,
} from "@crm-platform/shared-types";
import {
  getBlogs,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  uploadBlogImage,
} from "../controllers/blogController";
import { exportFmcg, getTraceability } from "../controllers/fmcgReportController";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/blogCategoryController";
import {
  getComplianceTasks,
  createComplianceTask,
  getComplianceTaskById,
  updateComplianceTask,
  deleteComplianceTask,
  getComplianceDocuments,
  createComplianceDocument,
  getComplianceDocumentById,
  updateComplianceDocument,
  deleteComplianceDocument,
} from "../controllers/complianceController";
import {
  fmcgProductController,
  fmcgBatchController,
  fmcgSupplierController,
  rmLotController,
  testReportController,
  temperatureLogController,
  cleaningLogController,
  calibrationLogController,
  pestLogController,
  waterTestController,
  complaintController,
  distributionController,
  recallEventController,
  licenseController,
} from "../controllers/fmcgController";

const blogsQuerySchema = paginationSchema.merge(searchSchema).extend({
  q: z.string().max(200).optional(),
  status: z.enum(BLOG_STATUSES).optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  featured: z.enum(["true", "false"]).optional(),
});

const blogAuthorSchema = z.object({
  name: z.string().min(1),
  avatar: z.string().optional(),
  bio: z.string().optional(),
});

const blogFieldsSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(BLOG_SLUG_PATTERN),
  content: z.string().min(1),
  excerpt: z.string().max(300).optional(),
  featuredImage: z.string().optional(),
  featuredImageAlt: z.string().max(200).optional(),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).optional(),
  author: blogAuthorSchema,
  status: z.enum(BLOG_STATUSES).optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.array(z.string()).optional(),
  canonicalUrl: z.string().optional(),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(200).optional(),
  ogImage: z.string().optional(),
  twitterTitle: z.string().max(70).optional(),
  twitterDescription: z.string().max(200).optional(),
  twitterImage: z.string().optional(),
  priority: z.number().min(0).max(1).optional(),
  changeFrequency: z.enum(BLOG_CHANGE_FREQUENCIES).optional(),
  isFeatured: z.boolean().optional(),
  relatedSlugs: z.array(z.string()).optional(),
  tableOfContents: z.array(z.object({ id: z.string(), text: z.string(), level: z.number() })).optional(),
});

const createBlogSchema = blogFieldsSchema;
const updateBlogSchema = blogFieldsSchema.partial();

const categoryFieldsSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(BLOG_SLUG_PATTERN),
  description: z.string().max(500).optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  parentId: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

const createCategorySchema = categoryFieldsSchema;
const updateCategorySchema = categoryFieldsSchema.partial();

const fmcgQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
});

const createFmcgProductSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(200),
  sku: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  nutritionalInfo: z.record(z.any()).optional(),
  shelfLifeDays: z.number().min(1),
  storageTemp: z.object({ min: z.number(), max: z.number() }),
  regulatoryApprovals: z.array(z.string()).optional(),
  barcode: z.string().optional(),
});

const createFmcgBatchSchema = z.object({
  workspaceId: workspaceIdSchema,
  productId: z.string().min(1),
  batchNumber: z.string().min(1),
  manufacturingDate: z.string().datetime(),
  expiryDate: z.string().datetime(),
  quantity: z.number().min(0),
  unitOfMeasure: z.string().min(1),
  supplierId: z.string().optional(),
  rawMaterialLots: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const createFmcgGenericSchema = z.object({
  workspaceId: workspaceIdSchema,
}).passthrough();

const router = Router();

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: BLOG_IMAGE_MAX_SIZE } });

router.get("/blogs", optionalAuth, validateQuery(blogsQuerySchema), getBlogs);
router.get("/blogs/slug/:slug", optionalAuth, getBlogBySlug);
router.get("/blogs/categories", optionalAuth, getCategories);
router.get("/blogs/categories/:id", optionalAuth, getCategoryById);
router.post("/blogs/categories", verifyToken, validate(createCategorySchema), createCategory);
router.put("/blogs/categories/:id", verifyToken, validate(updateCategorySchema), updateCategory);
router.delete("/blogs/categories/:id", verifyToken, deleteCategory);
router.post("/blogs/upload", verifyToken, imageUpload.single("file"), uploadBlogImage);
router.get("/blogs/:id", verifyToken, getBlogById);
router.post("/blogs", verifyToken, validate(createBlogSchema), createBlog);
router.put("/blogs/:id", verifyToken, validate(updateBlogSchema), updateBlog);
router.delete("/blogs/:id", verifyToken, deleteBlog);

router.get("/fmcg/export", verifyToken, requirePermission("fmcg.products.view"), validateQuery(fmcgQuerySchema), exportFmcg);
router.get("/fmcg/traceability", verifyToken, requirePermission("fmcg.batches.view"), validateQuery(fmcgQuerySchema), getTraceability);

function fmcgRoutes(path: string, controller: any, permission: string) {
  router.get(`/fmcg/${path}`, verifyToken, requirePermission(`fmcg.${permission}.view`), validateQuery(fmcgQuerySchema), controller.getAll);
  router.get(`/fmcg/${path}/:id`, verifyToken, requirePermission(`fmcg.${permission}.view`), controller.getById);
  router.post(`/fmcg/${path}`, verifyToken, requirePermission(`fmcg.${permission}.create`), validate(createFmcgGenericSchema), controller.create);
  router.put(`/fmcg/${path}/:id`, verifyToken, requirePermission(`fmcg.${permission}.edit`), controller.update);
  router.delete(`/fmcg/${path}/:id`, verifyToken, requirePermission(`fmcg.${permission}.delete`), controller.delete);
}

fmcgRoutes("products", fmcgProductController, "products");
fmcgRoutes("batches", fmcgBatchController, "batches");
fmcgRoutes("suppliers", fmcgSupplierController, "suppliers");
fmcgRoutes("rm-lots", rmLotController, "rmlots");
fmcgRoutes("test-reports", testReportController, "tests");
fmcgRoutes("temperature-logs", temperatureLogController, "logs");
fmcgRoutes("cleaning-logs", cleaningLogController, "logs");
fmcgRoutes("calibration-logs", calibrationLogController, "logs");
fmcgRoutes("pest-logs", pestLogController, "logs");
fmcgRoutes("water-tests", waterTestController, "tests");
fmcgRoutes("complaints", complaintController, "complaints");
fmcgRoutes("distributions", distributionController, "distributions");
fmcgRoutes("recall-events", recallEventController, "recalls");
fmcgRoutes("licenses", licenseController, "licenses");

router.get("/compliance/tasks", verifyToken, requirePermission("compliance.view"), getComplianceTasks);
router.post("/compliance/tasks", verifyToken, requirePermission("compliance.create"), createComplianceTask);
router.get("/compliance/tasks/:id", verifyToken, requirePermission("compliance.view"), getComplianceTaskById);
router.put("/compliance/tasks/:id", verifyToken, requirePermission("compliance.edit"), updateComplianceTask);
router.delete("/compliance/tasks/:id", verifyToken, requirePermission("compliance.delete"), deleteComplianceTask);
router.get("/compliance/documents", verifyToken, requirePermission("compliance.view"), getComplianceDocuments);
router.post("/compliance/documents", verifyToken, requirePermission("compliance.create"), createComplianceDocument);
router.get("/compliance/documents/:id", verifyToken, requirePermission("compliance.view"), getComplianceDocumentById);
router.put("/compliance/documents/:id", verifyToken, requirePermission("compliance.edit"), updateComplianceDocument);
router.delete("/compliance/documents/:id", verifyToken, requirePermission("compliance.delete"), deleteComplianceDocument);

export default router;
