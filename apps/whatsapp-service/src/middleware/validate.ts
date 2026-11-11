import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

function stripEmpty<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (value !== "") out[key] = value;
  }
  return out as T;
}

function withWorkspace(req: Request, body: Record<string, unknown>) {
  if (body.workspaceId) return body;
  const workspaceId = req.query.workspaceId || req.headers["x-workspace-id"];
  return workspaceId ? { ...body, workspaceId: String(workspaceId) } : body;
}

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(withWorkspace(req, stripEmpty(req.body)));
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(withWorkspace(req, stripEmpty(req.query as Record<string, unknown>)));
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid query parameters",
        errors: result.error.flatten(),
      });
    }
    req.query = result.data;
    next();
  };
}
