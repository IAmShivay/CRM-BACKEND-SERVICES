export interface IUser {
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

export interface IWorkspace {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  currency: string;
  timezone: string;
  planId: string;
  subscriptionStatus: string;
  settings: {
    dateFormat: string;
    timeFormat: string;
    weekStartsOn: number;
    language: string;
    autoCreateDeal?: boolean;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkspaceMember {
  _id: string;
  workspaceId: string;
  userId: string;
  roleId: string;
  status: string;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRole {
  _id: string;
  workspaceId: string;
  name: string;
  description?: string;
  permissions: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvitation {
  _id: string;
  workspaceId: string;
  email: string;
  roleId: string;
  invitedBy: string;
  token: string;
  status: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILead {
  _id: string;
  workspaceId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: string;
  statusId?: string;
  source: string;
  value: number;
  assignedTo?: string;
  tags: string[];
  tagIds: string[];
  notes?: string;
  customData: Record<string, any>;
  leadScore: number;
  leadScoreFactors: string[];
  priority: "low" | "medium" | "high";
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;
  createdBy: string;
  convertedToContactId?: string;
  convertedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContact {
  _id: string;
  workspaceId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  totalRevenue?: number;
  totalPayments?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  website?: string;
  linkedIn?: string;
  twitter?: string;
  originalLeadId?: string;
  convertedFromLead?: boolean;
  leadConversionDate?: Date;
  customData?: Record<string, any>;
  tagIds?: string[];
  category?: "client" | "prospect" | "partner" | "vendor" | "other";
  assignedTo?: string;
  accountManager?: string;
  status: "active" | "inactive" | "archived";
  priority: "low" | "medium" | "high";
  notes?: string;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeal {
  _id: string;
  workspaceId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  value: number;
  currency: string;
  contactId?: string;
  leadId?: string;
  assignedTo?: string;
  priority: "low" | "medium" | "high";
  status: "open" | "won" | "lost" | "abandoned";
  probability: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  lostReason?: string;
  wonNote?: string;
  source?: string;
  tags: string[];
  tagIds: string[];
  customData: Record<string, any>;
  notes?: string;
  stageEnteredAt: Date;
  stageHistory: Array<{
    stageId: string;
    stageName: string;
    enteredAt: Date;
    exitedAt?: Date;
    duration?: number;
  }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export * from './constants'
export * from './validators'
export * from './base'
