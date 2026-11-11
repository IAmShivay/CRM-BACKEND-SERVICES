import { Request, Response } from "express";
import {
  FmcgProduct,
  FmcgBatch,
  FmcgSupplier,
  RMLot,
  TestReport,
  TemperatureLog,
  CleaningLog,
  CalibrationLog,
  PestLog,
  WaterTest,
  Complaint,
  Distribution,
  RecallEvent,
  License,
} from "../models";

function crudFactory(Model: any, entityName: string) {
  return {
    getAll: async (req: Request, res: Response) => {
      try {
        const { workspaceId, page = "1", limit = "20" } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const filter: any = { workspaceId };

        const [items, total] = await Promise.all([
          Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
          Model.countDocuments(filter),
        ]);

        res.json({
          success: true,
          [entityName]: items,
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
        res.status(500).json({ message: `Failed to fetch ${entityName}` });
      }
    },

    getById: async (req: Request, res: Response) => {
      try {
        const item = await Model.findById(req.params.id);
        if (!item) return res.status(404).json({ message: `${entityName} not found` });
        res.json({ success: true, [entityName.replace(/s$/, "")]: item });
      } catch (error) {
        res.status(500).json({ message: `Failed to fetch ${entityName}` });
      }
    },

    create: async (req: Request, res: Response) => {
      try {
        const item = await Model.create({
          ...req.body,
          createdBy: (req as any).user?.userId,
        });
        res.status(201).json({ success: true, [entityName.replace(/s$/, "")]: item });
      } catch (error: any) {
        res.status(400).json({ message: error.message || `Failed to create ${entityName}` });
      }
    },

    update: async (req: Request, res: Response) => {
      try {
        const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ message: `${entityName} not found` });
        res.json({ success: true, [entityName.replace(/s$/, "")]: item });
      } catch (error: any) {
        res.status(400).json({ message: error.message || `Failed to update ${entityName}` });
      }
    },

    delete: async (req: Request, res: Response) => {
      try {
        const item = await Model.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: `${entityName} not found` });
        res.json({ success: true, message: `${entityName} deleted` });
      } catch (error) {
        res.status(500).json({ message: `Failed to delete ${entityName}` });
      }
    },
  };
}

export const fmcgProductController = crudFactory(FmcgProduct, "products");
export const fmcgBatchController = crudFactory(FmcgBatch, "batches");
export const fmcgSupplierController = crudFactory(FmcgSupplier, "suppliers");
export const rmLotController = crudFactory(RMLot, "rmLots");
export const testReportController = crudFactory(TestReport, "testReports");
export const temperatureLogController = crudFactory(TemperatureLog, "temperatureLogs");
export const cleaningLogController = crudFactory(CleaningLog, "cleaningLogs");
export const calibrationLogController = crudFactory(CalibrationLog, "calibrationLogs");
export const pestLogController = crudFactory(PestLog, "pestLogs");
export const waterTestController = crudFactory(WaterTest, "waterTests");
export const complaintController = crudFactory(Complaint, "complaints");
export const distributionController = crudFactory(Distribution, "distributions");
export const recallEventController = crudFactory(RecallEvent, "recallEvents");
export const licenseController = crudFactory(License, "licenses");
