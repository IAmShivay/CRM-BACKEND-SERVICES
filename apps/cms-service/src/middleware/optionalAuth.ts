import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@crm-platform/auth-middleware";

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const hasToken = Boolean(req.cookies?.auth_token || req.headers.authorization);
  if (!hasToken) return next();
  return verifyToken(req, res, next);
}
