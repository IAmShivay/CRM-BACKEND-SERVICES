import { Request, Response } from "express";
import { Sprint } from "../models/Sprint";
import { Task } from "../models/Task";

export const getSprints = async (req: Request, res: Response) => {
  try {
    const { workspaceId, projectId, status, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [sprints, total] = await Promise.all([
      Sprint.find(filter)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limitNum),
      Sprint.countDocuments(filter),
    ]);

    res.json({
      success: true,
      sprints,
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
    res.status(500).json({ message: "Failed to fetch sprints" });
  }
};

export const getSprintById = async (req: Request, res: Response) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    res.json({ success: true, sprint });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sprint" });
  }
};

export const createSprint = async (req: Request, res: Response) => {
  try {
    const sprint = await Sprint.create({
      ...req.body,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, sprint });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create sprint" });
  }
};

export const updateSprint = async (req: Request, res: Response) => {
  try {
    const sprint = await Sprint.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    res.json({ success: true, sprint });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update sprint" });
  }
};

export const deleteSprint = async (req: Request, res: Response) => {
  try {
    const sprint = await Sprint.findByIdAndDelete(req.params.id);
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    res.json({ success: true, message: "Sprint deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete sprint" });
  }
};

export const addTaskToSprint = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.body;
    const sprint = await Sprint.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { taskIds: taskId } },
      { new: true }
    );
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    await Task.updateOne({ _id: taskId }, { $set: { sprintId: sprint._id.toString() } });
    res.json({ success: true, sprint });
  } catch (error) {
    res.status(500).json({ message: "Failed to add task to sprint" });
  }
};

export const removeTaskFromSprint = async (req: Request, res: Response) => {
  try {
    const sprint = await Sprint.findByIdAndUpdate(
      req.params.id,
      { $pull: { taskIds: req.params.taskId } },
      { new: true }
    );
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    await Task.updateOne({ _id: req.params.taskId, sprintId: sprint._id.toString() }, { $unset: { sprintId: 1 } });
    res.json({ success: true, sprint });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove task from sprint" });
  }
};

function sprintTaskFilter(sprint: any) {
  return { $or: [{ sprintId: sprint._id.toString() }, { _id: { $in: sprint.taskIds || [] } }] };
}

export const startSprint = async (req: Request, res: Response) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    if (sprint.status !== "planning") return res.status(400).json({ message: "Only sprints in planning status can be started" });

    const active = await Sprint.findOne({ projectId: sprint.projectId, status: "active", _id: { $ne: sprint._id } });
    if (active) {
      return res.status(409).json({ message: `Sprint "${active.name}" is already active. Complete it before starting a new one.` });
    }

    sprint.status = "active";
    await sprint.save();
    res.json({ success: true, sprint });
  } catch (error) {
    res.status(500).json({ message: "Failed to start sprint" });
  }
};

export const completeSprint = async (req: Request, res: Response) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });
    if (sprint.status !== "active") return res.status(400).json({ message: "Only active sprints can be completed" });

    const { moveIncompleteTo } = req.body;
    const filter = sprintTaskFilter(sprint);
    const [completedTasks, incomplete] = await Promise.all([
      Task.countDocuments({ ...filter, completed: true }),
      Task.find({ ...filter, completed: false }).select("_id").lean(),
    ]);
    const incompleteIds = incomplete.map((t: any) => t._id.toString());

    if (incompleteIds.length) {
      if (moveIncompleteTo === "backlog") {
        await Task.updateMany({ _id: { $in: incompleteIds } }, { $unset: { sprintId: 1 } });
      } else {
        const target = await Sprint.findById(moveIncompleteTo);
        if (!target) return res.status(404).json({ message: "Target sprint not found" });
        await Task.updateMany({ _id: { $in: incompleteIds } }, { $set: { sprintId: target._id.toString() } });
        await Sprint.updateOne({ _id: target._id }, { $addToSet: { taskIds: { $each: incompleteIds } } });
      }
      await Sprint.updateOne({ _id: sprint._id }, { $pull: { taskIds: { $in: incompleteIds } } });
    }

    sprint.status = "completed";
    sprint.completedAt = new Date();
    await sprint.save();

    res.json({
      success: true,
      sprint,
      summary: { completedTasks, movedTasks: incompleteIds.length, moveTarget: moveIncompleteTo },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to complete sprint" });
  }
};
