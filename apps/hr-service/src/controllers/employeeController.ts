import { Request, Response } from "express";
import mongoose from "mongoose";

if (!mongoose.models.User) {
  mongoose.model("User", new mongoose.Schema({
    fullName: String,
    email: String,
    avatarUrl: String,
    phone: String,
  }, { collection: "users" }));
}

if (!mongoose.models.Role) {
  mongoose.model("Role", new mongoose.Schema({
    name: String,
    permissions: [String],
  }, { collection: "roles" }));
}

const WorkspaceMember = mongoose.models.WorkspaceMember || mongoose.model(
  "WorkspaceMember",
  new mongoose.Schema({
    workspaceId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    status: { type: String, default: "active" },
    joinedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  }, {
    collection: "workspacemembers",
    timestamps: true,
    toJSON: {
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  })
);

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const { workspaceId, page = "1", limit = "20" } = req.query;
    if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = { workspaceId, status: "active" };
    const [members, total] = await Promise.all([
      WorkspaceMember.find(filter)
        .populate("userId", "fullName email avatarUrl")
        .sort({ joinedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      WorkspaceMember.countDocuments(filter),
    ]);

    const employees = members.map((m: any) => {
      const user = m.userId || {};
      return {
        _id: m._id,
        id: m._id,
        userId: user._id || m.userId,
        fullName: user.fullName || "",
        email: user.email || "",
        avatar: user.avatarUrl || "",
        role: m.roleId,
        status: m.status,
        joinedAt: m.joinedAt,
        workspaceId: m.workspaceId,
      };
    });

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      employees,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages,
        hasNext: pageNum < pages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch employees" });
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const member: any = await WorkspaceMember.findById(req.params.id)
      .populate("userId", "fullName email avatarUrl phone");
    if (!member) return res.status(404).json({ message: "Employee not found" });
    const user = member.userId || {};
    res.json({
      success: true,
      employee: {
        _id: member._id,
        id: member._id,
        userId: user._id || member.userId,
        fullName: user.fullName || "",
        email: user.email || "",
        avatar: user.avatarUrl || "",
        phone: user.phone || "",
        role: member.roleId,
        status: member.status,
        joinedAt: member.joinedAt,
        workspaceId: member.workspaceId,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch employee" });
  }
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const { workspaceId, fullName, email, roleId, department, position, startDate } = req.body;
    const db = mongoose.connection.db!;
    const normalizedEmail = String(email).toLowerCase().trim();
    const roleObjectId = new mongoose.Types.ObjectId(roleId);

    const role = await db.collection("roles").findOne({ _id: roleObjectId });
    if (!role) return res.status(404).json({ message: "Role not found" });

    let user = await db.collection("users").findOne({ email: normalizedEmail });
    let status = "active";
    let message = "Existing user added to workspace";

    if (user) {
      const existingMember = await WorkspaceMember.findOne({ workspaceId, userId: user._id });
      if (existingMember) return res.status(400).json({ message: "User is already a member of this workspace" });
    } else {
      const now = new Date();
      const inserted = await db.collection("users").insertOne({
        email: normalizedEmail,
        fullName,
        password: "",
        emailConfirmed: false,
        timezone: "UTC",
        preferences: {},
        twoFactorEnabled: false,
        createdAt: now,
        updatedAt: now,
      });
      user = { _id: inserted.insertedId, email: normalizedEmail, fullName };
      status = "pending";
      message = "Employee invitation created successfully";
    }

    const member = await WorkspaceMember.create({
      workspaceId,
      userId: user._id,
      roleId: roleObjectId,
      status,
      joinedAt: new Date(),
      metadata: { department, position, startDate: startDate ? new Date(startDate) : new Date() },
    });

    res.status(201).json({
      success: true,
      message,
      employee: {
        id: member._id,
        userId: user._id,
        fullName: user.fullName || fullName,
        email: user.email,
        avatar: user.avatarUrl || "",
        role: { id: role._id, name: role.name },
        status: member.status,
        joinedAt: member.joinedAt,
        workspaceId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create employee" });
  }
};
