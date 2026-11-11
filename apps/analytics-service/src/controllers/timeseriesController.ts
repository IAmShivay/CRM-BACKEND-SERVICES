import { Request, Response } from "express";
import { mongoose } from "@crm-platform/db";

export const getLeadsTimeseries = async (req: Request, res: Response) => {
  try {
    const { workspaceId, period = "30d" } = req.query;
    const db = mongoose.connection.db!;

    const daysBack = period === "7d" ? 7 : period === "90d" ? 90 : period === "365d" ? 365 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const data = await db.collection("leads").aggregate([
      { $match: { workspaceId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]).toArray();

    const timeseries = data.map((d: any) => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`,
      count: d.count,
    }));

    res.json({ success: true, data: timeseries });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch leads timeseries" });
  }
};

export const getDealsTimeseries = async (req: Request, res: Response) => {
  try {
    const { workspaceId, period = "30d" } = req.query;
    const db = mongoose.connection.db!;

    const daysBack = period === "7d" ? 7 : period === "90d" ? 90 : period === "365d" ? 365 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const data = await db.collection("deals").aggregate([
      { $match: { workspaceId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
          totalValue: { $sum: "$value" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]).toArray();

    const timeseries = data.map((d: any) => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`,
      count: d.count,
      totalValue: d.totalValue,
    }));

    res.json({ success: true, data: timeseries });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch deals timeseries" });
  }
};

export const getRevenueTimeseries = async (req: Request, res: Response) => {
  try {
    const { workspaceId, period = "12m" } = req.query;
    const db = mongoose.connection.db!;

    const monthsBack = period === "6m" ? 6 : period === "24m" ? 24 : 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const data = await db.collection("deals").aggregate([
      {
        $match: {
          workspaceId,
          status: "won",
          actualCloseDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$actualCloseDate" },
            month: { $month: "$actualCloseDate" },
          },
          revenue: { $sum: "$value" },
          dealCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]).toArray();

    const timeseries = data.map((d: any) => ({
      month: `${d._id.year}-${String(d._id.month).padStart(2, "0")}`,
      revenue: d.revenue,
      dealCount: d.dealCount,
    }));

    res.json({ success: true, data: timeseries });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch revenue timeseries" });
  }
};
