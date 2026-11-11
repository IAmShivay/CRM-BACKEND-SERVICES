import { z } from 'zod';
export declare const phoneSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const emailSchema: z.ZodString;
export declare const nameSchema: z.ZodString;
export declare const workspaceIdSchema: z.ZodString;
export declare const mongoIdSchema: z.ZodString;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const dateRangeSchema: z.ZodObject<{
    dateFrom: z.ZodOptional<z.ZodString>;
    dateTo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
}, {
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
}>;
export declare const searchSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
}, {
    search?: string | undefined;
}>;
export declare const createLeadSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    name: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    company: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    value: z.ZodDefault<z.ZodNumber>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
    statusId: z.ZodOptional<z.ZodString>;
    assignedTo: z.ZodOptional<z.ZodString>;
    tagIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    notes: z.ZodOptional<z.ZodString>;
    customData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    value: number;
    name: string;
    priority: "low" | "medium" | "high";
    email?: string | undefined;
    phone?: string | undefined;
    company?: string | undefined;
    source?: string | undefined;
    statusId?: string | undefined;
    assignedTo?: string | undefined;
    tagIds?: string[] | undefined;
    notes?: string | undefined;
    customData?: Record<string, any> | undefined;
}, {
    workspaceId: string;
    name: string;
    value?: number | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    company?: string | undefined;
    source?: string | undefined;
    priority?: "low" | "medium" | "high" | undefined;
    statusId?: string | undefined;
    assignedTo?: string | undefined;
    tagIds?: string[] | undefined;
    notes?: string | undefined;
    customData?: Record<string, any> | undefined;
}>;
export declare const createContactSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    name: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    company: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodString>;
    category: z.ZodDefault<z.ZodEnum<["client", "prospect", "partner", "vendor", "other"]>>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "archived"]>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
    assignedTo: z.ZodOptional<z.ZodString>;
    tagIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    status: "active" | "inactive" | "archived";
    name: string;
    priority: "low" | "medium" | "high";
    category: "client" | "prospect" | "partner" | "vendor" | "other";
    email?: string | undefined;
    phone?: string | undefined;
    company?: string | undefined;
    assignedTo?: string | undefined;
    tagIds?: string[] | undefined;
    notes?: string | undefined;
    position?: string | undefined;
}, {
    workspaceId: string;
    name: string;
    status?: "active" | "inactive" | "archived" | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    company?: string | undefined;
    priority?: "low" | "medium" | "high" | undefined;
    assignedTo?: string | undefined;
    tagIds?: string[] | undefined;
    notes?: string | undefined;
    position?: string | undefined;
    category?: "client" | "prospect" | "partner" | "vendor" | "other" | undefined;
}>;
export declare const createDealSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    title: z.ZodString;
    value: z.ZodDefault<z.ZodNumber>;
    currency: z.ZodDefault<z.ZodString>;
    pipelineId: z.ZodString;
    stageId: z.ZodString;
    contactId: z.ZodOptional<z.ZodString>;
    leadId: z.ZodOptional<z.ZodString>;
    assignedTo: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    probability: z.ZodOptional<z.ZodNumber>;
    expectedCloseDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    value: number;
    priority: "low" | "medium" | "high" | "urgent";
    title: string;
    currency: string;
    pipelineId: string;
    stageId: string;
    assignedTo?: string | undefined;
    contactId?: string | undefined;
    leadId?: string | undefined;
    probability?: number | undefined;
    expectedCloseDate?: string | undefined;
}, {
    workspaceId: string;
    title: string;
    pipelineId: string;
    stageId: string;
    value?: number | undefined;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    assignedTo?: string | undefined;
    currency?: string | undefined;
    contactId?: string | undefined;
    leadId?: string | undefined;
    probability?: number | undefined;
    expectedCloseDate?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    twoFactorToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    twoFactorToken?: string | undefined;
}, {
    email: string;
    password: string;
    twoFactorToken?: string | undefined;
}>;
export declare const signupSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    fullName: z.ZodString;
    workspaceName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    fullName: string;
    workspaceName?: string | undefined;
}, {
    email: string;
    password: string;
    fullName: string;
    workspaceName?: string | undefined;
}>;
export declare const inviteSchema: z.ZodObject<{
    email: z.ZodString;
    roleId: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    roleId?: string | undefined;
    message?: string | undefined;
}, {
    email: string;
    roleId?: string | undefined;
    message?: string | undefined;
}>;
export declare const campaignStepSchema: z.ZodObject<{
    order: z.ZodNumber;
    channel: z.ZodEnum<["email", "whatsapp", "sms", "ai_reply"]>;
    subject: z.ZodOptional<z.ZodString>;
    body: z.ZodString;
    delayDays: z.ZodDefault<z.ZodNumber>;
    delayHours: z.ZodDefault<z.ZodNumber>;
    aiTone: z.ZodOptional<z.ZodEnum<["professional", "friendly", "casual"]>>;
    aiContext: z.ZodOptional<z.ZodString>;
    replyViaChannel: z.ZodOptional<z.ZodEnum<["email", "whatsapp", "sms"]>>;
}, "strip", z.ZodTypeAny, {
    order: number;
    channel: "email" | "whatsapp" | "sms" | "ai_reply";
    body: string;
    delayDays: number;
    delayHours: number;
    subject?: string | undefined;
    aiTone?: "professional" | "friendly" | "casual" | undefined;
    aiContext?: string | undefined;
    replyViaChannel?: "email" | "whatsapp" | "sms" | undefined;
}, {
    order: number;
    channel: "email" | "whatsapp" | "sms" | "ai_reply";
    body: string;
    subject?: string | undefined;
    delayDays?: number | undefined;
    delayHours?: number | undefined;
    aiTone?: "professional" | "friendly" | "casual" | undefined;
    aiContext?: string | undefined;
    replyViaChannel?: "email" | "whatsapp" | "sms" | undefined;
}>;
export declare const whatsappSendSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    accountId: z.ZodString;
    to: z.ZodEffects<z.ZodString, string, string>;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    message: string;
    accountId: string;
    to: string;
}, {
    workspaceId: string;
    message: string;
    accountId: string;
    to: string;
}>;
export declare const whatsappTemplateSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    accountId: z.ZodString;
    name: z.ZodString;
    language: z.ZodDefault<z.ZodString>;
    category: z.ZodDefault<z.ZodEnum<["MARKETING", "UTILITY", "AUTHENTICATION"]>>;
    bodyText: z.ZodString;
    headerType: z.ZodDefault<z.ZodEnum<["NONE", "TEXT", "IMAGE", "DOCUMENT", "VIDEO"]>>;
    headerContent: z.ZodOptional<z.ZodString>;
    footerText: z.ZodOptional<z.ZodString>;
    buttons: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["QUICK_REPLY", "URL", "PHONE_NUMBER"]>;
        text: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
        phoneNumber: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
        text: string;
        url?: string | undefined;
        phoneNumber?: string | undefined;
    }, {
        type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
        text: string;
        url?: string | undefined;
        phoneNumber?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    name: string;
    category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
    accountId: string;
    language: string;
    bodyText: string;
    headerType: "NONE" | "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO";
    headerContent?: string | undefined;
    footerText?: string | undefined;
    buttons?: {
        type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
        text: string;
        url?: string | undefined;
        phoneNumber?: string | undefined;
    }[] | undefined;
}, {
    workspaceId: string;
    name: string;
    accountId: string;
    bodyText: string;
    category?: "MARKETING" | "UTILITY" | "AUTHENTICATION" | undefined;
    language?: string | undefined;
    headerType?: "NONE" | "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO" | undefined;
    headerContent?: string | undefined;
    footerText?: string | undefined;
    buttons?: {
        type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
        text: string;
        url?: string | undefined;
        phoneNumber?: string | undefined;
    }[] | undefined;
}>;
export declare const broadcastSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    accountId: z.ZodString;
    recipients: z.ZodArray<z.ZodObject<{
        phone: z.ZodEffects<z.ZodString, string, string>;
        variables: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        contactId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        phone: string;
        contactId?: string | undefined;
        variables?: string[] | undefined;
    }, {
        phone: string;
        contactId?: string | undefined;
        variables?: string[] | undefined;
    }>, "many">;
    templateName: z.ZodString;
    language: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    accountId: string;
    language: string;
    recipients: {
        phone: string;
        contactId?: string | undefined;
        variables?: string[] | undefined;
    }[];
    templateName: string;
}, {
    workspaceId: string;
    accountId: string;
    recipients: {
        phone: string;
        contactId?: string | undefined;
        variables?: string[] | undefined;
    }[];
    templateName: string;
    language?: string | undefined;
}>;
export declare const socialPostSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    content: z.ZodString;
    platforms: z.ZodArray<z.ZodObject<{
        platform: z.ZodEnum<["facebook", "instagram", "linkedin", "twitter"]>;
        accountId: z.ZodString;
        customContent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        accountId: string;
        platform: "facebook" | "instagram" | "linkedin" | "twitter";
        customContent?: string | undefined;
    }, {
        accountId: string;
        platform: "facebook" | "instagram" | "linkedin" | "twitter";
        customContent?: string | undefined;
    }>, "many">;
    mediaUrls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["draft", "scheduled"]>>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    status: "draft" | "scheduled";
    content: string;
    platforms: {
        accountId: string;
        platform: "facebook" | "instagram" | "linkedin" | "twitter";
        customContent?: string | undefined;
    }[];
    mediaUrls?: string[] | undefined;
    scheduledAt?: string | undefined;
}, {
    workspaceId: string;
    content: string;
    platforms: {
        accountId: string;
        platform: "facebook" | "instagram" | "linkedin" | "twitter";
        customContent?: string | undefined;
    }[];
    status?: "draft" | "scheduled" | undefined;
    mediaUrls?: string[] | undefined;
    scheduledAt?: string | undefined;
}>;
export declare const appointmentSchema: z.ZodObject<{
    workspaceId: z.ZodString;
    serviceName: z.ZodString;
    customerName: z.ZodString;
    customerEmail: z.ZodOptional<z.ZodString>;
    customerPhone: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    startTime: z.ZodString;
    duration: z.ZodDefault<z.ZodNumber>;
    assignedTo: z.ZodOptional<z.ZodString>;
    price: z.ZodDefault<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
    source: z.ZodDefault<z.ZodEnum<["manual", "online", "phone", "whatsapp"]>>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    source: "phone" | "whatsapp" | "manual" | "online";
    serviceName: string;
    customerName: string;
    startTime: string;
    duration: number;
    price: number;
    assignedTo?: string | undefined;
    notes?: string | undefined;
    customerEmail?: string | undefined;
    customerPhone?: string | undefined;
}, {
    workspaceId: string;
    serviceName: string;
    customerName: string;
    startTime: string;
    source?: "phone" | "whatsapp" | "manual" | "online" | undefined;
    assignedTo?: string | undefined;
    notes?: string | undefined;
    customerEmail?: string | undefined;
    customerPhone?: string | undefined;
    duration?: number | undefined;
    price?: number | undefined;
}>;
export declare function formatPhone(phone: string): string;
export declare function formatDisplayPhone(phone: string): string;
