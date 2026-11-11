import { Request, Response, NextFunction } from "express";
import logger from "@crm-platform/logger";
import { NODE_ENVS } from "@crm-platform/shared-types";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
  });

  const statusCode = (err as any).statusCode || 500;
  const message =
    process.env.NODE_ENV === NODE_ENVS.PRODUCTION
      ? "Internal server error"
      : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== NODE_ENVS.PRODUCTION && { stack: err.stack }),
  });
}
