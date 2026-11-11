import { Request, Response } from "express";
import { mongoose } from "@crm-platform/db";

export const getPipelineAnalytics = async (req: Request, res: Response) => {
  try {
    const { workspaceId, pipelineId } = req.query;
    const db = mongoose.connection.db!;

    const matchFilter: any = { workspaceId, status: "open" };
    if (pipelineId) matchFilter.pipelineId = pipelineId;

    const stageData = await db.collection("deals").aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$stageId",
          count: { $sum: 1 },
          totalValue: { $sum: "$value" },
          avgValue: { $avg: "$value" },
          avgProbability: { $avg: "$probability" },
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();

    const stages = await db.collection("pipelinestages")
      .find({ pipelineId: pipelineId || { $exists: true } })
      .sort({ order: 1 })
      .toArray();

    const stageMap = new Map(stages.map((s: any) => [s._id.toString(), s]));

    const pipelineStages = stageData.map((s: any) => {
      const stage = stageMap.get(s._id);
      return {
        stageId: s._id,
        stageName: (stage as any)?.name || "Unknown",
        dealCount: s.count,
        totalValue: s.totalValue,
        avgValue: parseFloat(s.avgValue.toFixed(2)),
        avgProbability: parseFloat((s.avgProbability || 0).toFixed(2)),
      };
    });

    res.json({ success: true, data: pipelineStages });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pipeline analytics" });
  }
};

export const getConversionRates = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const db = mongoose.connection.db!;

    const deals = await db.collection("deals").aggregate([
      { $match: { workspaceId } },
      { $unwind: "$stageHistory" },
      {
        $group: {
          _id: "$stageHistory.stageId",
          stageName: { $first: "$stageHistory.stageName" },
          entries: { $sum: 1 },
          avgDuration: {
            $avg: {
              $cond: [
                { $gt: ["$stageHistory.duration", 0] },
                "$stageHistory.duration",
                null,
              ],
            },
          },
        },
      },
      { $sort: { entries: -1 } },
    ]).toArray();

    res.json({
      success: true,
      data: deals.map((d: any) => ({
        stageId: d._id,
        stageName: d.stageName,
        entries: d.entries,
        avgDurationMs: d.avgDuration ? Math.round(d.avgDuration) : null,
        avgDurationDays: d.avgDuration ? parseFloat((d.avgDuration / 86400000).toFixed(1)) : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch conversion rates" });
  }
};

export const getDealVelocity = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const db = mongoose.connection.db!;

    const data = await db.collection("deals").aggregate([
      { $match: { workspaceId, status: "won", actualCloseDate: { $ne: null } } },
      {
        $project: {
          value: 1,
          cycleTime: { $subtract: ["$actualCloseDate", "$createdAt"] },
        },
      },
      {
        $group: {
          _id: null,
          avgCycleTimeMs: { $avg: "$cycleTime" },
          avgDealSize: { $avg: "$value" },
          totalWon: { $sum: 1 },
        },
      },
    ]).toArray();

    const result = data[0] || { avgCycleTimeMs: 0, avgDealSize: 0, totalWon: 0 };

    res.json({
      success: true,
      data: {
        avgCycleDays: result.avgCycleTimeMs ? parseFloat((result.avgCycleTimeMs / 86400000).toFixed(1)) : 0,
        avgDealSize: parseFloat((result.avgDealSize || 0).toFixed(2)),
        totalWon: result.totalWon,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch deal velocity" });
  }
};
