import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  mongoIdSchema,
  paginationSchema,
  searchSchema,
} from "@crm-platform/shared-types";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getStockMovements,
  getProductAnalytics,
  getLowStockProducts,
} from "../controllers/productController";

const productsQuerySchema = paginationSchema.merge(searchSchema).extend({
  workspaceId: workspaceIdSchema,
  category: z.string().optional(),
  isActive: z.string().optional(),
});

const createProductSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(200),
  sku: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0).default(0),
  currency: z.string().default("INR"),
  taxRate: z.number().min(0).max(100).default(0),
  stock: z.number().default(0),
  lowStockThreshold: z.number().default(10),
  unit: z.string().default("pcs"),
});

const adjustStockSchema = z.object({
  type: z.enum(["in", "out", "adjustment"]),
  quantity: z.number().min(0),
  reference: z.string().optional(),
});

const analyticsQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

const router = Router();

router.get("/", verifyToken, requirePermission("products.view"), validateQuery(productsQuerySchema), getProducts);
router.get("/analytics", verifyToken, requirePermission("products.view"), validateQuery(analyticsQuerySchema), getProductAnalytics);
router.get("/low-stock", verifyToken, requirePermission("products.view"), validateQuery(analyticsQuerySchema), getLowStockProducts);
router.get("/:id", verifyToken, requirePermission("products.view"), getProductById);
router.post("/", verifyToken, requirePermission("products.create"), validate(createProductSchema), createProduct);
router.put("/:id", verifyToken, requirePermission("products.edit"), updateProduct);
router.delete("/:id", verifyToken, requirePermission("products.delete"), deleteProduct);
router.post("/:id/stock", verifyToken, requirePermission("products.edit"), validate(adjustStockSchema), adjustStock);
router.get("/:id/movements", verifyToken, requirePermission("products.view"), getStockMovements);

export default router;
