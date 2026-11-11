import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Omit<Document, "_id"> {
  _id: string;
  email: string;
  password: string;
  fullName?: string;
  avatarUrl?: string;
  timezone: string;
  preferences: Record<string, any>;
  emailConfirmed: boolean;
  emailConfirmedAt?: Date;
  lastSignInAt?: Date;
  lastActiveWorkspaceId?: string;
  currentWorkspace?: string;
  oauthProvider?: string;
  oauthId?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  emailVerificationOtp?: string;
  emailVerificationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    fullName: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    preferences: {
      type: Schema.Types.Mixed,
      default: {},
    },
    emailConfirmed: {
      type: Boolean,
      default: false,
    },
    emailConfirmedAt: {
      type: Date,
    },
    lastSignInAt: {
      type: Date,
    },
    lastActiveWorkspaceId: {
      type: String,
      ref: "Workspace",
    },
    currentWorkspace: {
      type: String,
      ref: "Workspace",
    },
    oauthProvider: {
      type: String,
    },
    oauthId: {
      type: String,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    emailVerificationOtp: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    twoFactorSecret: {
      type: String,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

UserSchema.index({ lastSignInAt: -1 }, { sparse: true });

export const User =
  mongoose.models?.User || mongoose.model<IUser>("User", UserSchema);
