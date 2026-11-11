import { Request, Response } from "express";
import { mongoose } from "@crm-platform/db";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const db = mongoose.connection.db!;

    const [leadsCount, contactsCount, dealsData, activitiesData] = await Promise.all([
      db.collection("leads").countDocuments({ workspaceId }),
      db.collection("contacts").countDocuments({ workspaceId }),
      db.collection("deals").aggregate([
        { $match: { workspaceId } },
        {
          $group: {
            _id: null,
            totalDeals: { $sum: 1 },
            totalRevenue: {
              $sum: { $cond: [{ $eq: ["$status", "won"] }, "$value", 0] },
            },
            wonDeals: {
              $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] },
            },
            openDeals: {
              $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
            },
            lostDeals: {
              $sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] },
            },
            pipelineValue: {
              $sum: { $cond: [{ $eq: ["$status", "open"] }, "$value", 0] },
            },
          },
        },
      ]).toArray(),
      db.collection("activities")
        .find({ workspaceId })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
    ]);

    const deals = dealsData[0] || {
      totalDeals: 0,
      totalRevenue: 0,
      wonDeals: 0,
      openDeals: 0,
      lostDeals: 0,
      pipelineValue: 0,
    };

    const conversionRate = deals.totalDeals > 0
      ? ((deals.wonDeals / deals.totalDeals) * 100).toFixed(2)
      : "0.00";

    res.json({
      success: true,
      data: {
        totalLeads: leadsCount,
        totalContacts: contactsCount,
        totalDeals: deals.totalDeals,
        openDeals: deals.openDeals,
        wonDeals: deals.wonDeals,
        lostDeals: deals.lostDeals,
        totalRevenue: deals.totalRevenue,
        pipelineValue: deals.pipelineValue,
        conversionRate: parseFloat(conversionRate),
        recentActivities: activitiesData,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};

export const getLeadsBySource = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const db = mongoose.connection.db!;

    const data = await db.collection("leads").aggregate([
      { $match: { workspaceId } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();

    res.json({ success: true, data: data.map((d: any) => ({ source: d._id, count: d.count })) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch leads by source" });
  }
};

export const getTeamPerformance = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const db = mongoose.connection.db!;

    const [leadsByAssignee, dealsByAssignee] = await Promise.all([
      db.collection("leads").aggregate([
        { $match: { workspaceId, assignedTo: { $ne: null } } },
        { $group: { _id: "$assignedTo", leadsCount: { $sum: 1 } } },
      ]).toArray(),
      db.collection("deals").aggregate([
        { $match: { workspaceId, assignedTo: { $ne: null } } },
        {
          $group: {
            _id: "$assignedTo",
            dealsCount: { $sum: 1 },
            totalValue: { $sum: "$value" },
            wonCount: { $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] } },
            wonValue: { $sum: { $cond: [{ $eq: ["$status", "won"] }, "$value", 0] } },
          },
        },
      ]).toArray(),
    ]);

    const performanceMap: Record<string, any> = {};
    leadsByAssignee.forEach((l: any) => {
      performanceMap[l._id] = { userId: l._id, leadsCount: l.leadsCount, dealsCount: 0, totalValue: 0, wonCount: 0, wonValue: 0 };
    });
    dealsByAssignee.forEach((d: any) => {
      if (!performanceMap[d._id]) {
        performanceMap[d._id] = { userId: d._id, leadsCount: 0 };
      }
      Object.assign(performanceMap[d._id], {
        dealsCount: d.dealsCount,
        totalValue: d.totalValue,
        wonCount: d.wonCount,
        wonValue: d.wonValue,
      });
    });

    res.json({ success: true, data: Object.values(performanceMap) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team performance" });
  }
};
