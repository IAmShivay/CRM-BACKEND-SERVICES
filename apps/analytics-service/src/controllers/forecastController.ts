import { Request, Response } from "express";
import { mongoose } from "@crm-platform/db";

export const getRevenueForecast = async (req: Request, res: Response) => {
  try {
    const { workspaceId, months = "6" } = req.query;
    const db = mongoose.connection.db!;

    const openDeals = await db.collection("deals").aggregate([
      { $match: { workspaceId, status: "open" } },
      {
        $project: {
          value: 1,
          probability: 1,
          expectedCloseDate: 1,
          weightedValue: { $multiply: ["$value", { $divide: ["$probability", 100] }] },
        },
      },
    ]).toArray();

    const monthCount = parseInt(months as string, 10);
    const forecast: Array<{ month: string; projected: number; weighted: number; dealCount: number }> = [];

    for (let i = 0; i < monthCount; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthDeals = openDeals.filter((d: any) => {
        if (!d.expectedCloseDate) return false;
        const closeDate = new Date(d.expectedCloseDate);
        return closeDate >= monthStart && closeDate <= monthEnd;
      });

      forecast.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        projected: monthDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
        weighted: monthDeals.reduce((sum: number, d: any) => sum + (d.weightedValue || 0), 0),
        dealCount: monthDeals.length,
      });
    }

    const totalProjected = forecast.reduce((s, f) => s + f.projected, 0);
    const totalWeighted = forecast.reduce((s, f) => s + f.weighted, 0);

    res.json({
      success: true,
      data: {
        monthly: forecast,
        totalProjected,
        totalWeighted,
        openDealsCount: openDeals.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch revenue forecast" });
  }
};

export const getWinRateForecast = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const db = mongoose.connection.db!;

    const last6Months = new Date();
    last6Months.setMonth(last6Months.getMonth() - 6);

    const data = await db.collection("deals").aggregate([
      {
        $match: {
          workspaceId,
          status: { $in: ["won", "lost"] },
          updatedAt: { $gte: last6Months },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$updatedAt" },
            month: { $month: "$updatedAt" },
          },
          won: { $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]).toArray();

    const winRateTrend = data.map((d: any) => ({
      month: `${d._id.year}-${String(d._id.month).padStart(2, "0")}`,
      winRate: d.total > 0 ? parseFloat(((d.won / d.total) * 100).toFixed(2)) : 0,
      won: d.won,
      lost: d.lost,
      total: d.total,
    }));

    res.json({ success: true, data: winRateTrend });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch win rate forecast" });
  }
};
