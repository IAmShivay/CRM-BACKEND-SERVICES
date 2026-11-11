import { Request, Response } from "express";
import { Task } from "../models/Task";

export const getTasks = async (req: Request, res: Response) => {
  try {
    const {
      workspaceId,
      projectId,
      status,
      priority,
      assigneeId,
      columnId,
      search,
      page = "1",
      limit = "50",
    } = req.query;

    const filter: any = { workspaceId };
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assigneeId) filter.assigneeId = assigneeId;
    if (columnId) filter.columnId = columnId;
    if (search) filter.$text = { $search: search as string };

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      tasks,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch task" });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const task = await Task.create({
      ...req.body,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, task });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create task" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const updates = { ...req.body };
    if (updates.status === "done" && !updates.completed) {
      updates.completed = true;
      updates.completedAt = new Date();
    }
    if (updates.status && updates.status !== "done") {
      updates.completed = false;
      updates.completedAt = null;
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ success: true, task });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update task" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task" });
  }
};

export const toggleTaskCompletion = async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const completed = !task.completed;
    const updates: any = {
      completed,
      completedAt: completed ? new Date() : null,
      status: completed ? "done" : "todo",
    };

    const updated = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ success: true, task: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle task completion" });
  }
};

export const bulkUpdateTasks = async (req: Request, res: Response) => {
  try {
    const { taskIds, workspaceId, updates } = req.body;
    const result = await Task.updateMany(
      { _id: { $in: taskIds }, workspaceId },
      { $set: updates }
    );
    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `Updated ${result.modifiedCount} tasks`,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to bulk update tasks" });
  }
};

export const reorderTasks = async (req: Request, res: Response) => {
  try {
    const { tasks } = req.body;
    const ops = tasks.map((t: { id: string; order: number; columnId?: string }) => ({
      updateOne: {
        filter: { _id: t.id },
        update: { $set: { order: t.order, ...(t.columnId && { columnId: t.columnId }) } },
      },
    }));
    await Task.bulkWrite(ops);
    res.json({ success: true, message: "Tasks reordered" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reorder tasks" });
  }
};

function closeSession(task: any, userId: string, now: Date) {
  if (!task.timeTracking?.isActive || !task.timeTracking.currentSessionStart) return;
  const duration = Math.max(Math.floor((now.getTime() - new Date(task.timeTracking.currentSessionStart).getTime()) / 1000), 0);
  task.timeTracking.sessions.push({ startedAt: task.timeTracking.currentSessionStart, endedAt: now, duration, userId });
  task.timeTracking.totalTracked += duration;
  task.timeTracking.isActive = false;
  task.timeTracking.currentSessionStart = undefined;
  task.actualHours = Math.round((task.timeTracking.totalTracked / 3600) * 100) / 100;
}

function openSession(task: any, now: Date) {
  task.timeTracking.isActive = true;
  task.timeTracking.currentSessionStart = now;
}

async function loadTask(req: Request, res: Response) {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return null;
  }
  if (!task.timeTracking) {
    task.timeTracking = { isActive: false, totalTracked: 0, sessions: [] } as any;
  }
  return task;
}

export const startTimeTracking = async (req: Request, res: Response) => {
  try {
    const task = await loadTask(req, res);
    if (!task) return;
    const now = new Date();
    closeSession(task, req.user!.userId, now);
    openSession(task, now);
    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ message: "Failed to start time tracking" });
  }
};

export const stopTimeTracking = async (req: Request, res: Response) => {
  try {
    const task = await loadTask(req, res);
    if (!task) return;
    if (!task.timeTracking.isActive) return res.status(400).json({ message: "Time tracking is not active" });
    closeSession(task, req.user!.userId, new Date());
    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ message: "Failed to stop time tracking" });
  }
};

export const pauseTimeTracking = async (req: Request, res: Response) => {
  try {
    const task = await loadTask(req, res);
    if (!task) return;
    if (!task.timeTracking.isActive) return res.status(400).json({ message: "Time tracking is not active" });
    closeSession(task, req.user!.userId, new Date());
    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ message: "Failed to pause time tracking" });
  }
};

export const resumeTimeTracking = async (req: Request, res: Response) => {
  try {
    const task = await loadTask(req, res);
    if (!task) return;
    if (task.timeTracking.isActive) return res.status(400).json({ message: "Time tracking is already active" });
    openSession(task, new Date());
    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ message: "Failed to resume time tracking" });
  }
};
