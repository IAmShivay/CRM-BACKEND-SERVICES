import { Request, Response } from "express";
import { mongoose } from "@crm-platform/db";

export const getMetrics = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const db = mongoose.connection.db!;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [currentLeads, previousLeads, currentDeals, previousDeals, currentRevenue, previousRevenue] =
      await Promise.all([
        db.collection("leads").countDocuments({ workspaceId, createdAt: { $gte: thirtyDaysAgo } }),
        db.collection("leads").countDocuments({
          workspaceId,
          createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        }),
        db.collection("deals").countDocuments({ workspaceId, createdAt: { $gte: thirtyDaysAgo } }),
        db.collection("deals").countDocuments({
          workspaceId,
          createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        }),
        db.collection("deals").aggregate([
          { $match: { workspaceId, status: "won", actualCloseDate: { $gte: thirtyDaysAgo } } },
          { $group: { _id: null, total: { $sum: "$value" } } },
        ]).toArray(),
        db.collection("deals").aggregate([
          {
            $match: {
              workspaceId,
              status: "won",
              actualCloseDate: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
            },
          },
          { $group: { _id: null, total: { $sum: "$value" } } },
        ]).toArray(),
      ]);

    const currentRevenueVal = currentRevenue[0]?.total || 0;
    const previousRevenueVal = previousRevenue[0]?.total || 0;

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(2));
    };

    res.json({
      success: true,
      data: {
        leads: {
          current: currentLeads,
          previous: previousLeads,
          change: calcChange(currentLeads, previousLeads),
        },
        deals: {
          current: currentDeals,
          previous: previousDeals,
          change: calcChange(currentDeals, previousDeals),
        },
        revenue: {
          current: currentRevenueVal,
          previous: previousRevenueVal,
          change: calcChange(currentRevenueVal, previousRevenueVal),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch metrics" });
  }
};

export const getActivityMetrics = async (req: Request, res: Response) => {
  try {
    const { workspaceId, days = "30" } = req.query;
    const db = mongoose.connection.db!;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string, 10));

    const data = await db.collection("activities").aggregate([
      { $match: { workspaceId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$activityType",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();

    res.json({
      success: true,
      data: data.map((d: any) => ({
        type: d._id,
        count: d.count,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activity metrics" });
  }
};
