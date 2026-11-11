import { z } from 'zod'

export const phoneSchema = z
  .string()
  .min(10)
  .max(15)
  .transform(val => val.replace(/[^0-9]/g, ''))

export const emailSchema = z.string().email().toLowerCase().trim()

export const nameSchema = z.string().min(1).max(100).trim()

export const workspaceIdSchema = z.string().min(1)

export const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i)

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const dateRangeSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

export const searchSchema = z.object({
  search: z.string().max(200).optional(),
})

export const createLeadSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  company: z.string().max(100).optional(),
  source: z.string().optional(),
  value: z.coerce.number().min(0).default(0),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  statusId: mongoIdSchema.optional(),
  assignedTo: mongoIdSchema.optional(),
  tagIds: z.array(mongoIdSchema).optional(),
  notes: z.string().max(5000).optional(),
  customData: z.record(z.any()).optional(),
})

export const createContactSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  company: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  category: z.enum(['client', 'prospect', 'partner', 'vendor', 'other']).default('prospect'),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assignedTo: mongoIdSchema.optional(),
  tagIds: z.array(mongoIdSchema).optional(),
  notes: z.string().max(2000).optional(),
})

export const createDealSchema = z.object({
  workspaceId: workspaceIdSchema,
  title: z.string().min(1).max(200),
  value: z.coerce.number().min(0).default(0),
  currency: z.string().max(5).default('INR'),
  pipelineId: mongoIdSchema,
  stageId: mongoIdSchema,
  contactId: mongoIdSchema.optional(),
  leadId: mongoIdSchema.optional(),
  assignedTo: mongoIdSchema.optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  probability: z.coerce.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  twoFactorToken: z.string().optional(),
})

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
  fullName: nameSchema,
  workspaceName: z.string().min(1).max(100).optional(),
})

export const inviteSchema = z.object({
  email: emailSchema,
  roleId: mongoIdSchema.optional(),
  message: z.string().max(500).optional(),
})

export const campaignStepSchema = z.object({
  order: z.coerce.number().min(0),
  channel: z.enum(['email', 'whatsapp', 'sms', 'ai_reply']),
  subject: z.string().max(200).optional(),
  body: z.string().min(1),
  delayDays: z.coerce.number().min(0).default(1),
  delayHours: z.coerce.number().min(0).max(23).default(0),
  aiTone: z.enum(['professional', 'friendly', 'casual']).optional(),
  aiContext: z.string().max(2000).optional(),
  replyViaChannel: z.enum(['email', 'whatsapp', 'sms']).optional(),
})

export const whatsappSendSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: mongoIdSchema,
  to: phoneSchema,
  message: z.string().min(1).max(4096),
})

export const whatsappTemplateSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: mongoIdSchema,
  name: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  language: z.string().max(10).default('en'),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']).default('UTILITY'),
  bodyText: z.string().min(1).max(1024),
  headerType: z.enum(['NONE', 'TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO']).default('NONE'),
  headerContent: z.string().optional(),
  footerText: z.string().max(60).optional(),
  buttons: z.array(z.object({
    type: z.enum(['QUICK_REPLY', 'URL', 'PHONE_NUMBER']),
    text: z.string().max(25),
    url: z.string().url().optional(),
    phoneNumber: phoneSchema.optional(),
  })).max(3).optional(),
})

export const broadcastSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: mongoIdSchema,
  recipients: z.array(z.object({
    phone: phoneSchema,
    variables: z.array(z.string()).optional(),
    contactId: mongoIdSchema.optional(),
  })).min(1).max(1000),
  templateName: z.string().min(1).max(100),
  language: z.string().max(10).default('en'),
})

export const socialPostSchema = z.object({
  workspaceId: workspaceIdSchema,
  content: z.string().min(1).max(5000),
  platforms: z.array(z.object({
    platform: z.enum(['facebook', 'instagram', 'linkedin', 'twitter']),
    accountId: mongoIdSchema,
    customContent: z.string().optional(),
  })).min(1),
  mediaUrls: z.array(z.string().url()).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['draft', 'scheduled']).default('draft'),
})

export const appointmentSchema = z.object({
  workspaceId: workspaceIdSchema,
  serviceName: z.string().min(1).max(100),
  customerName: nameSchema,
  customerEmail: emailSchema.optional(),
  customerPhone: phoneSchema.optional(),
  startTime: z.string().datetime(),
  duration: z.coerce.number().min(5).max(480).default(60),
  assignedTo: mongoIdSchema.optional(),
  price: z.coerce.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
  source: z.enum(['manual', 'online', 'phone', 'whatsapp']).default('manual'),
})

export function formatPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned
  }
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }
  return cleaned
}

export function formatDisplayPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  return phone
}
