import { Request, Response } from "express";
import { mongoose } from "@crm-platform/db";

const N8nApiKey = mongoose.models?.N8nApiKey || mongoose.model("N8nApiKey", new mongoose.Schema(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true },
    apiKey: { type: String, required: true },
    baseUrl: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, ref: "User", required: true },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } },
  }
));

const WorkflowCatalog = mongoose.models?.WorkflowCatalog || mongoose.model("WorkflowCatalog", new mongoose.Schema(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    n8nApiKeyId: { type: String, ref: "N8nApiKey", required: true },
    externalId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    tags: [{ type: String }],
    lastSyncedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } },
  }
));

export const getApiKeys = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const keys = await N8nApiKey.find({ workspaceId }).select("-apiKey");
    res.json({ success: true, data: keys });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch API keys" });
  }
};

export const createApiKey = async (req: Request, res: Response) => {
  try {
    const key = await N8nApiKey.create({
      ...req.body,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, apiKey: key });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create API key" });
  }
};

export const updateApiKey = async (req: Request, res: Response) => {
  try {
    const key = await N8nApiKey.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!key) return res.status(404).json({ message: "API key not found" });
    res.json({ success: true, apiKey: key });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update API key" });
  }
};

export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const key = await N8nApiKey.findByIdAndDelete(req.params.id);
    if (!key) return res.status(404).json({ message: "API key not found" });
    res.json({ success: true, message: "API key deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete API key" });
  }
};

export const getCatalog = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const workflows = await WorkflowCatalog.find({ workspaceId }).sort({ name: 1 });
    const categoryNames = [...new Set(workflows.map((w: any) => w.category).filter(Boolean))] as string[];
    const categories = categoryNames.map((name, index) => ({
      id: name,
      name,
      description: "",
      icon: "",
      sortOrder: index,
      workflowCount: workflows.filter((w: any) => w.category === name).length,
    }));
    res.json({
      success: true,
      data: {
        workflows,
        categories,
        pagination: { total: workflows.length, limit: workflows.length, offset: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch workflow catalog" });
  }
};

export const executeWorkflow = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { data } = req.body;

    const workflow = await WorkflowCatalog.findById(workflowId);
    if (!workflow) return res.status(404).json({ message: "Workflow not found" });

    res.json({
      success: true,
      execution: {
        workflowId: (workflow as any).externalId,
        status: "triggered",
        triggeredAt: new Date().toISOString(),
        data,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to execute workflow" });
  }
};

export const syncWorkflows = async (req: Request, res: Response) => {
  try {
    const { workspaceId, n8nApiKeyId } = req.body;

    await WorkflowCatalog.updateMany(
      { workspaceId, n8nApiKeyId },
      { lastSyncedAt: new Date() }
    );

    res.json({ success: true, message: "Workflows synced" });
  } catch (error) {
    res.status(500).json({ message: "Failed to sync workflows" });
  }
};

const WorkflowExecution = mongoose.models?.WorkflowExecution || mongoose.model("WorkflowExecution", new mongoose.Schema(
  {
    workspaceId: { type: String, required: true },
    workflowId: { type: String },
    status: { type: String, enum: ["running", "completed", "failed", "waiting"], default: "running" },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    tokensUsed: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    inputData: { type: mongoose.Schema.Types.Mixed },
    outputData: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
    requiresInput: { type: Boolean, default: false },
    inputRequirement: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } }, collection: "workflowexecutions" }
));

const UserInput = mongoose.models?.UserInput || mongoose.model("UserInput", new mongoose.Schema(
  {
    workspaceId: { type: String, required: true },
    executionId: { type: String, required: true },
    workflowId: { type: String },
    status: { type: String, enum: ["pending", "completed", "expired"], default: "pending" },
    prompt: { type: String },
    fields: [{ type: mongoose.Schema.Types.Mixed }],
    response: { type: mongoose.Schema.Types.Mixed },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    step: { type: Number },
    expiresAt: { type: Date },
    receivedAt: { type: Date },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } }, collection: "userinputs" }
));

export const getUsage = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const timeframe = parseInt(req.query.timeframe as string) || 30;
    const since = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

    const executions = await WorkflowExecution.find({
      workspaceId,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });

    const totalTokens = executions.reduce((sum: number, e: any) => sum + (e.tokensUsed || 0), 0);
    const totalCost = executions.reduce((sum: number, e: any) => sum + (e.cost || 0), 0);

    res.json({
      data: {
        totalExecutions: executions.length,
        totalTokens,
        totalCost,
        executions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch usage" });
  }
};

export const getBillingHistory = async (_req: Request, res: Response) => {
  try {
    res.json({ data: [] });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch billing" });
  }
};

export const getExecutions = async (req: Request, res: Response) => {
  try {
    const { workspaceId, page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [executions, total] = await Promise.all([
      WorkflowExecution.find({ workspaceId }).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      WorkflowExecution.countDocuments({ workspaceId }),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      data: executions,
      pagination: { page: pageNum, limit: limitNum, total, pages, hasNext: pageNum < pages, hasPrev: pageNum > 1 },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch executions" });
  }
};

export const getExecutionById = async (req: Request, res: Response) => {
  try {
    const execution = await WorkflowExecution.findById(req.params.id);
    if (!execution) return res.status(404).json({ message: "Execution not found" });
    res.json({ success: true, data: execution });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch execution" });
  }
};

export const getPendingInputs = async (req: Request, res: Response) => {
  try {
    const { workspaceId, limit: lim = "20", priority, workflowId } = req.query;
    const filter: any = { workspaceId, status: "pending" };
    if (priority) filter.priority = priority;
    if (workflowId) filter.workflowId = workflowId;

    const inputs = await UserInput.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(lim as string, 10));

    res.json({ success: true, data: inputs, total: inputs.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending inputs" });
  }
};

const N8N_HEADERS = (apiKey: string) => ({ "X-N8N-API-KEY": apiKey, Accept: "application/json" });

async function pingN8n(baseUrl: string, apiKey: string) {
  try {
    const r = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/workflows?limit=1`, { headers: N8N_HEADERS(apiKey) });
    return r.ok;
  } catch {
    return false;
  }
}

export const validateApiKey = async (req: Request, res: Response) => {
  try {
    const { apiKey, provider = "n8n", baseUrl } = req.body;
    let valid = false;
    if (provider === "openrouter") {
      const r = await fetch("https://openrouter.ai/api/v1/auth/key", { headers: { Authorization: `Bearer ${apiKey}` } }).catch(() => null);
      valid = Boolean(r?.ok);
    } else {
      valid = await pingN8n(baseUrl || process.env.N8N_BASE_URL || "", apiKey);
    }
    res.json({ success: true, valid, provider });
  } catch (error) {
    res.status(500).json({ message: "Failed to validate API key" });
  }
};

export const testConnection = async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId || req.headers["x-workspace-id"] || "");
    const key: any = await N8nApiKey.findOne({ workspaceId, isActive: true }).sort({ createdAt: -1 });
    if (!key) return res.json({ success: true, connected: false, message: "No active n8n API key" });
    const connected = await pingN8n(key.baseUrl, key.apiKey);
    res.json({ success: true, connected, baseUrl: key.baseUrl });
  } catch (error) {
    res.status(500).json({ message: "Failed to test connection" });
  }
};

export const getWorkflowDetails = async (req: Request, res: Response) => {
  try {
    const workflow = await WorkflowCatalog.findById(req.params.id);
    if (!workflow) return res.status(404).json({ message: "Workflow not found" });
    res.json({ success: true, data: workflow });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch workflow" });
  }
};

export const getExecutionInput = async (req: Request, res: Response) => {
  try {
    const execution: any = await WorkflowExecution.findById(req.params.id);
    if (!execution) return res.status(404).json({ message: "Execution not found" });
    const [input, workflow]: any[] = await Promise.all([
      UserInput.findOne({ executionId: execution._id.toString(), status: "pending" }).sort({ createdAt: -1 }),
      execution.workflowId ? WorkflowCatalog.findById(execution.workflowId) : null,
    ]);
    const workflowName = workflow?.name || execution.workflowName || "Workflow";
    res.json({
      success: true,
      data: {
        isWaitingForInput: Boolean(input),
        execution: { id: execution._id, status: execution.status, workflowName, createdAt: execution.createdAt },
        inputRequirement: input
          ? {
              step: input.step || 1,
              inputSchema: { prompt: input.prompt, fields: input.fields || [] },
              timeoutAt: input.expiresAt || null,
              timeRemaining: input.expiresAt ? Math.max(new Date(input.expiresAt).getTime() - Date.now(), 0) : 0,
              isExpired: input.expiresAt ? new Date(input.expiresAt).getTime() < Date.now() : false,
            }
          : undefined,
        userInput: input
          ? {
              id: input._id,
              step: input.step || 1,
              metadata: { workflowName, stepDescription: input.prompt, priority: input.priority || "medium", requiresImmediate: input.priority === "high" },
              createdAt: input.createdAt,
            }
          : null,
        message: input ? "Waiting for input" : "No input required",
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch execution input" });
  }
};

export const submitExecutionInput = async (req: Request, res: Response) => {
  try {
    const execution: any = await WorkflowExecution.findById(req.params.id);
    if (!execution) return res.status(404).json({ message: "Execution not found" });
    const input: any = await UserInput.findOne({ executionId: execution._id.toString(), status: "pending" }).sort({ createdAt: -1 });
    if (!input) return res.status(400).json({ message: "No pending input for this execution" });

    input.status = "completed";
    input.response = req.body.data ?? req.body;
    input.receivedAt = new Date();
    await input.save();

    const remaining = await UserInput.countDocuments({ executionId: execution._id.toString(), status: "pending" });
    if (!remaining && execution.status === "waiting") {
      execution.status = "running";
      await execution.save();
    }

    res.json({
      success: true,
      message: "Input submitted",
      data: {
        execution: { _id: execution._id, status: execution.status, currentStep: input.step || 1 },
        userInput: { _id: input._id, status: input.status, receivedAt: input.receivedAt },
        workflowStatus: { finished: execution.status === "completed", isWaitingForMoreInput: remaining > 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit execution input" });
  }
};
