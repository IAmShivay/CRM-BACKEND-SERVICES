import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  const cookieToken = req.cookies?.auth_token;
  if (cookieToken) {
    token = cookieToken;
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const secret = process.env.JWT_SECRET || "fallback-secret-key";
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const mongoose = require("mongoose");
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(500).json({ message: "Database not connected" });
    }

    const workspaceId =
      req.params.workspaceId ||
      req.query.workspaceId ||
      req.body?.workspaceId ||
      req.headers["x-workspace-id"];

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID required" });
    }

    const ObjectId = mongoose.Types.ObjectId;
    const wid = workspaceId as string;
    const uid = req.user.userId;

    const membership = await db.collection("workspacemembers").findOne({
      $or: [
        { workspaceId: wid, userId: uid },
        { workspaceId: new ObjectId(wid), userId: new ObjectId(uid) },
      ],
      status: "active",
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    let userPermissions: string[] = [];
    let roleName = "";

    if (membership.roleId) {
      const roleId = membership.roleId;
      const role = await db.collection("roles").findOne({
        $or: [
          { _id: roleId },
          { _id: new ObjectId(roleId.toString()) },
        ],
      });
      if (role) {
        userPermissions = role.permissions || [];
        roleName = role.name || "";
      }
    }

    if (
      userPermissions.includes("*:*") ||
      userPermissions.includes(permission) ||
      ["Owner", "Admin"].includes(roleName)
    ) {
      return next();
    }

    return res.status(403).json({ message: "Insufficient permissions" });
  };
}

export function verifyInternalKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.INTERNAL_API_KEY;
  const provided = req.headers["x-internal-key"];
  if (!expected || provided !== expected) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export default verifyToken;
