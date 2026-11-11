"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
exports.requirePermission = requirePermission;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function verifyToken(req, res, next) {
    let token;
    const cookieToken = req.cookies?.auth_token;
    if (cookieToken) {
        token = cookieToken;
    }
    else {
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
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
function requirePermission(permission) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }
        const mongoose = require("mongoose");
        const WorkspaceMember = mongoose.model("WorkspaceMember");
        const workspaceId = req.params.workspaceId ||
            req.query.workspaceId ||
            req.body?.workspaceId ||
            req.headers["x-workspace-id"];
        if (!workspaceId) {
            return res.status(400).json({ message: "Workspace ID required" });
        }
        const membership = await WorkspaceMember.findOne({
            workspaceId,
            userId: req.user.userId,
            status: "active",
        }).populate("roleId");
        if (!membership) {
            return res.status(403).json({ message: "Access denied" });
        }
        const userPermissions = membership.roleId?.permissions || [];
        const roleName = membership.roleId?.name || "";
        if (userPermissions.includes("*:*") ||
            userPermissions.includes(permission) ||
            ["Owner", "Admin"].includes(roleName)) {
            return next();
        }
        return res.status(403).json({ message: "Insufficient permissions" });
    };
}
exports.default = verifyToken;
