import { Request, Response } from "express";
import { FmcgBatch } from "../models/fmcg/Batch";
import { FmcgProduct } from "../models/fmcg/Product";
import { FmcgSupplier } from "../models/fmcg/Supplier";
import { TestReport, Distribution, License } from "../models/fmcg/ComplianceLogs";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvSection(title: string, columns: string[], rows: Record<string, unknown>[]): string {
  const lines = [title, columns.join(","), ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(","))];
  return lines.join("\r\n");
}

function withId(doc: any) {
  return { ...doc, id: doc._id?.toString() };
}

function batchFilter(query: Request["query"]) {
  const { workspaceId, batchId, productId, dateFrom, dateTo } = query;
  const filter: any = { workspaceId };
  if (batchId) filter._id = batchId;
  if (productId) filter.productId = productId;
  if (dateFrom || dateTo) {
    filter.manufacturingDate = {};
    if (dateFrom) filter.manufacturingDate.$gte = new Date(String(dateFrom));
    if (dateTo) filter.manufacturingDate.$lte = new Date(String(dateTo));
  }
  return filter;
}

export const exportFmcg = async (req: Request, res: Response) => {
  try {
    const { workspaceId, productId, batchId } = req.query;
    const productQuery: any = { workspaceId };
    if (productId) productQuery._id = productId;
    const reportQuery: any = { workspaceId };
    if (batchId) reportQuery.batchId = batchId;

    const [products, batches, licenses, reports, distributions] = await Promise.all([
      FmcgProduct.find(productQuery).lean(),
      FmcgBatch.find(batchFilter(req.query)).lean(),
      License.find({ workspaceId }).lean(),
      TestReport.find(reportQuery).lean(),
      Distribution.find({ workspaceId }).lean(),
    ]);

    const batchIds = new Set(batches.map((b: any) => b._id.toString()));
    const reportsForBatches = batchId ? reports : reports.filter((r: any) => batchIds.has(String(r.batchId)));
    const distributionsForBatches = distributions.filter((d: any) => batchIds.has(String(d.batchId)));

    const csv = [
      csvSection("Products", ["id", "name", "sku", "category", "shelfLifeDays", "barcode", "isActive", "createdAt"], products.map(withId)),
      csvSection("Batches", ["id", "batchNumber", "productId", "manufacturingDate", "expiryDate", "quantity", "unitOfMeasure", "supplierId", "status", "qualityCheckPassed"], batches.map(withId)),
      csvSection("Test Reports", ["id", "batchId", "testType", "testDate", "result", "testedBy", "notes"], reportsForBatches.map(withId)),
      csvSection("Distributions", ["id", "batchId", "destination", "dispatchDate", "quantity", "vehicleNumber", "driverName", "receivedBy"], distributionsForBatches.map(withId)),
      csvSection("Licenses", ["id", "name", "licenseNumber", "issuedBy", "issuedDate", "expiryDate", "status"], licenses.map(withId)),
    ].join("\r\n\r\n");

    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fssai-export-${workspaceId}-${new Date().toISOString().split("T")[0]}.csv"`,
    });
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Failed to export FMCG data" });
  }
};

export const getTraceability = async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId);
    const batches = await FmcgBatch.find(batchFilter(req.query)).sort({ createdAt: -1 }).limit(100).lean();

    const traceability = await Promise.all(
      batches.map(async (batch: any) => {
        const id = batch._id.toString();
        const [product, supplier, testReports, distributions] = await Promise.all([
          FmcgProduct.findOne({ _id: batch.productId, workspaceId }).lean(),
          batch.supplierId ? FmcgSupplier.findOne({ _id: batch.supplierId, workspaceId }).lean() : null,
          TestReport.find({ batchId: id, workspaceId }).lean(),
          Distribution.find({ batchId: id, workspaceId }).lean(),
        ]);
        return {
          batch: withId(batch),
          product: product ? withId(product) : null,
          supplier: supplier ? withId(supplier) : null,
          testReports: testReports.map(withId),
          distributions: distributions.map(withId),
        };
      })
    );

    res.json({ success: true, traceability, total: traceability.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch traceability" });
  }
};
