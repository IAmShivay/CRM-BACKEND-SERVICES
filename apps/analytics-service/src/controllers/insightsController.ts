import { Request, Response } from "express";
import mongoose from "mongoose";

const DAY_MS = 86400000;
const FORMATS: Record<string, string> = { day: "%Y-%m-%d", week: "%G-W%V", month: "%Y-%m" };

function dateRange(req: Request) {
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(to.getTime() - 30 * DAY_MS);
  return { from, to };
}

export const getLeadSources = async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId);
    const { from, to } = dateRange(req);
    const rows = await mongoose.connection.db!
      .collection("leads")
      .aggregate([
        { $match: { workspaceId, createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $ifNull: ["$source", "unknown"] },
            count: { $sum: 1 },
            converted: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ["$status", "converted"] }, { $ne: [{ $ifNull: ["$convertedToContactId", null] }, null] }] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const total = rows.reduce((sum, r) => sum + r.count, 0);
    const data = rows.map((r) => ({
      source: r._id,
      count: r.count,
      percentage: total ? Number(((r.count / total) * 100).toFixed(1)) : 0,
      conversionRate: r.count ? Number(((r.converted / r.count) * 100).toFixed(1)) : 0,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch lead sources" });
  }
};

export const getTimeseries = async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId);
    const { from, to } = dateRange(req);
    const format = FORMATS[String(req.query.granularity || "day")] || FORMATS.day;
    const db = mongoose.connection.db!;

    const bucket = (field: string) => ({ $dateToString: { format, date: `$${field}` } });

    const [leads, conversions, revenue] = await Promise.all([
      db.collection("leads").aggregate([
        { $match: { workspaceId, createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: bucket("createdAt"), value: { $sum: 1 } } },
      ]).toArray(),
      db.collection("leads").aggregate([
        { $match: { workspaceId, convertedAt: { $gte: from, $lte: to } } },
        { $group: { _id: bucket("convertedAt"), value: { $sum: 1 } } },
      ]).toArray(),
      db.collection("deals").aggregate([
        { $match: { workspaceId, status: "won", updatedAt: { $gte: from, $lte: to } } },
        { $group: { _id: bucket("updatedAt"), value: { $sum: "$value" } } },
      ]).toArray(),
    ]);

    const series = new Map<string, { date: string; leads: number; revenue: number; conversions: number }>();
    const get = (date: string) => {
      if (!series.has(date)) series.set(date, { date, leads: 0, revenue: 0, conversions: 0 });
      return series.get(date)!;
    };
    for (const r of leads) get(r._id).leads = r.value;
    for (const r of conversions) get(r._id).conversions = r.value;
    for (const r of revenue) get(r._id).revenue = r.value;

    res.json({ success: true, data: [...series.values()].sort((a, b) => a.date.localeCompare(b.date)) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch timeseries" });
  }
};
