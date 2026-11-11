import { Request, Response } from "express";
import mongoose from "mongoose";

const OnboardingProgress = mongoose.models?.OnboardingProgress || mongoose.model("OnboardingProgress", new mongoose.Schema(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    userId: { type: String, ref: "User", required: true },
    steps: {
      profileCompleted: { type: Boolean, default: false },
      workspaceConfigured: { type: Boolean, default: false },
      teamInvited: { type: Boolean, default: false },
      firstLeadCreated: { type: Boolean, default: false },
      pipelineConfigured: { type: Boolean, default: false },
      integrationConnected: { type: Boolean, default: false },
    },
    completedAt: { type: Date },
    skippedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } },
  }
));

export const getOnboardingStatus = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const userId = (req as any).user?.userId;

    let progress = await OnboardingProgress.findOne({ workspaceId, userId });
    if (!progress) {
      progress = await OnboardingProgress.create({ workspaceId, userId });
    }

    const steps = (progress as any).steps || {};
    const totalSteps = Object.keys(steps).length;
    const completedSteps = Object.values(steps).filter(Boolean).length;

    res.json({
      success: true,
      onboarding: {
        progress: progress,
        percentComplete: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
        isComplete: completedSteps === totalSteps,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch onboarding status" });
  }
};

export const updateOnboardingStep = async (req: Request, res: Response) => {
  try {
    const { workspaceId, step, completed } = req.body;
    const userId = (req as any).user?.userId;

    const update: any = { [`steps.${step}`]: completed };

    const progress = await OnboardingProgress.findOneAndUpdate(
      { workspaceId, userId },
      { $set: update },
      { new: true, upsert: true }
    );

    const steps = (progress as any).steps || {};
    const allComplete = Object.values(steps).every(Boolean);
    if (allComplete && !(progress as any).completedAt) {
      await OnboardingProgress.findByIdAndUpdate(progress._id, { completedAt: new Date() });
    }

    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ message: "Failed to update onboarding step" });
  }
};

export const skipOnboarding = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;
    const userId = (req as any).user?.userId;

    const progress = await OnboardingProgress.findOneAndUpdate(
      { workspaceId, userId },
      { skippedAt: new Date() },
      { new: true, upsert: true }
    );

    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ message: "Failed to skip onboarding" });
  }
};
