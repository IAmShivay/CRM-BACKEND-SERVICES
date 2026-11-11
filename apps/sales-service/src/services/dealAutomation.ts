import mongoose from "mongoose";
import { DEFAULT_PIPELINE_NAME, DEFAULT_PIPELINE_STAGES } from "@crm-platform/shared-types";
import logger from "@crm-platform/logger";
import { Deal } from "../models/Deal";
import { Pipeline } from "../models/Pipeline";
import { PipelineStage } from "../models/PipelineStage";

async function isAutoCreateEnabled(workspaceId: string): Promise<boolean> {
  const db = mongoose.connection.db!;
  const ObjectId = mongoose.Types.ObjectId;
  const workspace = await db.collection("workspaces").findOne(
    { $or: [{ _id: ObjectId.isValid(workspaceId) ? new ObjectId(workspaceId) : workspaceId }, { _id: workspaceId as any }] },
    { projection: { "settings.autoCreateDeal": 1 } }
  );
  return Boolean(workspace?.settings?.autoCreateDeal);
}

export async function ensureDefaultPipeline(workspaceId: string, createdBy: string) {
  let pipeline =
    (await Pipeline.findOne({ workspaceId, isDefault: true, isActive: true })) ||
    (await Pipeline.findOne({ workspaceId, isActive: true }).sort({ createdAt: 1 }));

  if (!pipeline) {
    pipeline = await Pipeline.create({ workspaceId, name: DEFAULT_PIPELINE_NAME, isDefault: true, createdBy });
    await PipelineStage.insertMany(
      DEFAULT_PIPELINE_STAGES.map((s, order) => ({
        workspaceId,
        pipelineId: pipeline._id.toString(),
        name: s.name,
        color: s.color,
        order,
        probability: s.probability,
        isWonStage: "isWonStage" in s,
        isLostStage: "isLostStage" in s,
        createdBy,
      }))
    );
    logger.info("Created default pipeline", { workspaceId, pipelineId: pipeline._id });
  }

  const firstStage = await PipelineStage.findOne({ pipelineId: pipeline._id.toString(), isActive: true }).sort({ order: 1 });
  return { pipeline, firstStage };
}

export async function createDealForLead(lead: any) {
  const workspaceId = String(lead.workspaceId);
  if (!(await isAutoCreateEnabled(workspaceId))) return null;

  const existing = await Deal.findOne({ workspaceId, leadId: lead._id.toString() });
  if (existing) return existing;

  const createdBy = lead.createdBy || lead.assignedTo || "system";
  const { pipeline, firstStage } = await ensureDefaultPipeline(workspaceId, createdBy);
  if (!firstStage) {
    logger.warn("Default pipeline has no stages, skipping auto deal", { workspaceId, pipelineId: pipeline._id });
    return null;
  }

  const now = new Date();
  const deal = await Deal.create({
    workspaceId,
    pipelineId: pipeline._id.toString(),
    stageId: firstStage._id.toString(),
    title: lead.company ? `${lead.name} - ${lead.company}` : lead.name,
    value: lead.value || 0,
    currency: pipeline.currency,
    leadId: lead._id.toString(),
    assignedTo: lead.assignedTo,
    priority: lead.priority || "medium",
    probability: firstStage.probability,
    source: lead.source,
    tagIds: lead.tagIds || [],
    stageEnteredAt: now,
    stageHistory: [{ stageId: firstStage._id.toString(), stageName: firstStage.name, enteredAt: now }],
    createdBy,
  });

  logger.info("Auto-created deal for lead", { workspaceId, leadId: lead._id, dealId: deal._id });
  return deal;
}
