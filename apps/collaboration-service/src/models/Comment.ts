import mongoose from "mongoose";

if (!mongoose.models.User) {
  mongoose.model(
    "User",
    new mongoose.Schema(
      { fullName: String, email: String, avatarUrl: String },
      { collection: "users" }
    )
  );
}

const CommentSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, maxlength: 10000 },
    entityType: {
      type: String,
      required: true,
      enum: ["task", "project", "document"],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    workspaceId: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
    editHistory: [
      {
        content: String,
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        editedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, toJSON: { transform: (_doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } }, collection: "comments" }
);

CommentSchema.index({ entityType: 1, entityId: 1 });
CommentSchema.index({ workspaceId: 1 });

export const Comment = mongoose.model("Comment", CommentSchema);
