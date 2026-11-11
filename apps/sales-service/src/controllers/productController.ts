import { Request, Response } from "express";
import { Product } from "../models/Product";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { workspaceId, category, isActive, search, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) filter.$text = { $search: search as string };

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      products,
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
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.create({
      ...req.body,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, product });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create product" });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true, product });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update product" });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete product" });
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { type, quantity, reference } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let newStock = product.stock;
    if (type === "in") newStock += quantity;
    else if (type === "out") newStock -= quantity;
    else newStock = quantity;

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        stock: newStock,
        $push: {
          movements: { type, quantity, reference, date: new Date() },
        },
      },
      { new: true }
    );

    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to adjust stock" });
  }
};

export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).select("movements name sku stock").lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true, movements: (product as any).movements || [] });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stock movements" });
  }
};

export const getProductAnalytics = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;

    const [totalProducts, activeProducts, lowStock] = await Promise.all([
      Product.countDocuments({ workspaceId }),
      Product.countDocuments({ workspaceId, isActive: true }),
      Product.countDocuments({
        workspaceId,
        isActive: true,
        $expr: { $lte: ["$stock", "$lowStockThreshold"] },
      }),
    ]);

    res.json({
      success: true,
      analytics: { totalProducts, activeProducts, lowStockCount: lowStock },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch product analytics" });
  }
};

export const getLowStockProducts = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;

    const products = await Product.find({
      workspaceId,
      isActive: true,
      $expr: { $lte: ["$stock", "$lowStockThreshold"] },
    })
      .select("name sku stock lowStockThreshold category")
      .sort({ stock: 1 });

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch low stock products" });
  }
};
