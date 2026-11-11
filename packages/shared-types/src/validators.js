"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentSchema = exports.socialPostSchema = exports.broadcastSchema = exports.whatsappTemplateSchema = exports.whatsappSendSchema = exports.campaignStepSchema = exports.inviteSchema = exports.signupSchema = exports.loginSchema = exports.createDealSchema = exports.createContactSchema = exports.createLeadSchema = exports.searchSchema = exports.dateRangeSchema = exports.paginationSchema = exports.mongoIdSchema = exports.workspaceIdSchema = exports.nameSchema = exports.emailSchema = exports.phoneSchema = void 0;
exports.formatPhone = formatPhone;
exports.formatDisplayPhone = formatDisplayPhone;
const zod_1 = require("zod");
exports.phoneSchema = zod_1.z
    .string()
    .min(10)
    .max(15)
    .transform(val => val.replace(/[^0-9]/g, ''));
exports.emailSchema = zod_1.z.string().email().toLowerCase().trim();
exports.nameSchema = zod_1.z.string().min(1).max(100).trim();
exports.workspaceIdSchema = zod_1.z.string().min(1);
exports.mongoIdSchema = zod_1.z.string().regex(/^[a-f\d]{24}$/i);
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
exports.dateRangeSchema = zod_1.z.object({
    dateFrom: zod_1.z.string().datetime().optional(),
    dateTo: zod_1.z.string().datetime().optional(),
});
exports.searchSchema = zod_1.z.object({
    search: zod_1.z.string().max(200).optional(),
});
exports.createLeadSchema = zod_1.z.object({
    workspaceId: exports.workspaceIdSchema,
    name: exports.nameSchema,
    email: exports.emailSchema.optional(),
    phone: exports.phoneSchema.optional(),
    company: zod_1.z.string().max(100).optional(),
    source: zod_1.z.string().optional(),
    value: zod_1.z.coerce.number().min(0).default(0),
    priority: zod_1.z.enum(['low', 'medium', 'high']).default('medium'),
    statusId: exports.mongoIdSchema.optional(),
    assignedTo: exports.mongoIdSchema.optional(),
    tagIds: zod_1.z.array(exports.mongoIdSchema).optional(),
    notes: zod_1.z.string().max(5000).optional(),
    customData: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.createContactSchema = zod_1.z.object({
    workspaceId: exports.workspaceIdSchema,
    name: exports.nameSchema,
    email: exports.emailSchema.optional(),
    phone: exports.phoneSchema.optional(),
    company: zod_1.z.string().max(100).optional(),
    position: zod_1.z.string().max(100).optional(),
    category: zod_1.z.enum(['client', 'prospect', 'partner', 'vendor', 'other']).default('prospect'),
    status: zod_1.z.enum(['active', 'inactive', 'archived']).default('active'),
    priority: zod_1.z.enum(['low', 'medium', 'high']).default('medium'),
    assignedTo: exports.mongoIdSchema.optional(),
    tagIds: zod_1.z.array(exports.mongoIdSchema).optional(),
    notes: zod_1.z.string().max(2000).optional(),
});
exports.createDealSchema = zod_1.z.object({
    workspaceId: exports.workspaceIdSchema,
    title: zod_1.z.string().min(1).max(200),
    value: zod_1.z.coerce.number().min(0).default(0),
    currency: zod_1.z.string().max(5).default('INR'),
    pipelineId: exports.mongoIdSchema,
    stageId: exports.mongoIdSchema,
    contactId: exports.mongoIdSchema.optional(),
    leadId: exports.mongoIdSchema.optional(),
    assignedTo: exports.mongoIdSchema.optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    probability: zod_1.z.coerce.number().min(0).max(100).optional(),
    expectedCloseDate: zod_1.z.string().datetime().optional(),
});
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1),
    twoFactorToken: zod_1.z.string().optional(),
});
exports.signupSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(8).max(100),
    fullName: exports.nameSchema,
    workspaceName: zod_1.z.string().min(1).max(100).optional(),
});
exports.inviteSchema = zod_1.z.object({
    email: exports.emailSchema,
    roleId: exports.mongoIdSchema.optional(),
    message: zod_1.z.string().max(500).optional(),
});
exports.campaignStepSchema = zod_1.z.object({
    order: zod_1.z.coerce.number().min(0),
    channel: zod_1.z.enum(['email', 'whatsapp', 'sms', 'ai_reply']),
    subject: zod_1.z.string().max(200).optional(),
    body: zod_1.z.string().min(1),
    delayDays: zod_1.z.coerce.number().min(0).default(1),
    delayHours: zod_1.z.coerce.number().min(0).max(23).default(0),
    aiTone: zod_1.z.enum(['professional', 'friendly', 'casual']).optional(),
    aiContext: zod_1.z.string().max(2000).optional(),
    replyViaChannel: zod_1.z.enum(['email', 'whatsapp', 'sms']).optional(),
});
exports.whatsappSendSchema = zod_1.z.object({
    workspaceId: exports.workspaceIdSchema,
    accountId: exports.mongoIdSchema,
    to: exports.phoneSchema,
    message: zod_1.z.string().min(1).max(4096),
});
exports.whatsappTemplateSchema = zod_1.z.object({
    workspaceId: exports.workspaceIdSchema,
    accountId: exports.mongoIdSchema,
    name: zod_1.z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
    language: zod_1.z.string().max(10).default('en'),
    category: zod_1.z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']).default('UTILITY'),
    bodyText: zod_1.z.string().min(1).max(1024),
    headerType: zod_1.z.enum(['NONE', 'TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO']).default('NONE'),
    headerContent: zod_1.z.string().optional(),
    footerText: zod_1.z.string().max(60).optional(),
    buttons: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['QUICK_REPLY', 'URL', 'PHONE_NUMBER']),
        text: zod_1.z.string().max(25),
        url: zod_1.z.string().url().optional(),
        phoneNumber: exports.phoneSchema.optional(),
    })).max(3).optional(),
});
exports.broadcastSchema = zod_1.z.object({
    workspaceId: exports.workspaceIdSchema,
    accountId: exports.mongoIdSchema,
    recipients: zod_1.z.array(zod_1.z.object({
        phone: exports.phoneSchema,
        variables: zod_1.z.array(zod_1.z.string()).optional(),
        contactId: exports.mongoIdSchema.optional(),
    })).min(1).max(1000),
    templateName: zod_1.z.string().min(1).max(100),
    language: zod_1.z.string().max(10).default('en'),
});
exports.socialPostSchema = zod_1.z.object({
    workspaceId: exports.workspaceIdSchema,
    content: zod_1.z.string().min(1).max(5000),
    platforms: zod_1.z.array(zod_1.z.object({
        platform: zod_1.z.enum(['facebook', 'instagram', 'linkedin', 'twitter']),
        accountId: exports.mongoIdSchema,
        customContent: zod_1.z.string().optional(),
    })).min(1),
    mediaUrls: zod_1.z.array(zod_1.z.string().url()).optional(),
    scheduledAt: zod_1.z.string().datetime().optional(),
    status: zod_1.z.enum(['draft', 'scheduled']).default('draft'),
});
exports.appointmentSchema = zod_1.z.object({
    workspaceId: exports.workspaceIdSchema,
    serviceName: zod_1.z.string().min(1).max(100),
    customerName: exports.nameSchema,
    customerEmail: exports.emailSchema.optional(),
    customerPhone: exports.phoneSchema.optional(),
    startTime: zod_1.z.string().datetime(),
    duration: zod_1.z.coerce.number().min(5).max(480).default(60),
    assignedTo: exports.mongoIdSchema.optional(),
    price: zod_1.z.coerce.number().min(0).default(0),
    notes: zod_1.z.string().max(2000).optional(),
    source: zod_1.z.enum(['manual', 'online', 'phone', 'whatsapp']).default('manual'),
});
function formatPhone(phone) {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }
    if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    }
    return cleaned;
}
function formatDisplayPhone(phone) {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
        return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
}
