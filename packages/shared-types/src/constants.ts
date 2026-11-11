export const NODE_ENVS = {
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  TEST: 'test',
} as const

export const ASSET_TYPES = [
  'laptop',
  'desktop',
  'monitor',
  'phone',
  'tablet',
  'accessories',
  'vehicle',
  'furniture',
  'equipment',
  'software',
] as const

export const ASSET_STATUS = [
  'available',
  'allocated',
  'maintenance',
  'retired',
  'lost',
  'damaged',
] as const

export const ASSET_CONDITION = [
  'excellent',
  'good',
  'fair',
  'poor',
] as const

export const LEAD_SOURCES = [
  'manual',
  'website',
  'referral',
  'social_media',
  'advertisement',
  'cold_call',
  'email',
  'event',
  'partner',
  'other',
] as const

export const LEAD_PRIORITIES = ['low', 'medium', 'high'] as const

export const DEAL_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

export const DEAL_STATUSES = ['open', 'won', 'lost', 'abandoned'] as const

export const CONTACT_CATEGORIES = [
  'client',
  'prospect',
  'partner',
  'vendor',
  'other',
] as const

export const CONTACT_STATUSES = ['active', 'inactive', 'archived'] as const

export const LEAVE_TYPES = [
  'casual',
  'sick',
  'earned',
  'maternity',
  'paternity',
  'unpaid',
  'compensatory',
  'bereavement',
] as const

export const LEAVE_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
] as const

export const ATTENDANCE_STATUSES = [
  'present',
  'absent',
  'half_day',
  'late',
  'on_leave',
  'holiday',
  'weekend',
] as const

export const SHIFT_TYPES = [
  'morning',
  'afternoon',
  'night',
  'flexible',
  'split',
] as const

export const CAMPAIGN_CHANNELS = [
  'email',
  'whatsapp',
  'sms',
  'ai_reply',
] as const

export const CAMPAIGN_STATUSES = [
  'draft',
  'active',
  'paused',
  'completed',
] as const

export const ENROLLMENT_STATUSES = [
  'active',
  'completed',
  'paused',
  'failed',
  'unsubscribed',
] as const

export const SEQUENCE_STATUSES = ['draft', 'active', 'paused'] as const

export const WHATSAPP_MESSAGE_TYPES = [
  'text',
  'image',
  'document',
  'video',
  'audio',
  'template',
  'interactive',
  'button',
  'location',
  'contacts',
] as const

export const WHATSAPP_MESSAGE_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
] as const

export const WHATSAPP_PROVIDERS = ['meta_cloud', 'wati', 'gupshup'] as const

export const WHATSAPP_TEMPLATE_STATUSES = [
  'APPROVED',
  'PENDING',
  'REJECTED',
] as const

export const WHATSAPP_TEMPLATE_CATEGORIES = [
  'MARKETING',
  'UTILITY',
  'AUTHENTICATION',
] as const

export const WHATSAPP_HEADER_TYPES = [
  'NONE',
  'TEXT',
  'IMAGE',
  'DOCUMENT',
  'VIDEO',
] as const

export const WHATSAPP_BUTTON_TYPES = [
  'QUICK_REPLY',
  'URL',
  'PHONE_NUMBER',
] as const

export const CONVERSATION_MODES = [
  'ai',
  'human',
  'workflow',
  'idle',
] as const

export const CONVERSATION_STATUSES = [
  'active',
  'closed',
  'archived',
] as const

export const BOT_FLOW_STEP_TYPES = [
  'send_message',
  'wait_for_reply',
  'keyword_match',
  'quick_reply',
  'list_message',
  'ai_reply',
  'assign_human',
  'delay',
  'condition',
] as const

export const BOT_TONE = ['professional', 'friendly', 'casual'] as const

export const BOT_MATCH_TYPES = ['exact', 'contains', 'regex'] as const

export const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'linkedin',
  'twitter',
] as const

export const SOCIAL_POST_STATUSES = [
  'draft',
  'scheduled',
  'publishing',
  'published',
  'failed',
] as const

export const SUBSCRIPTION_STATUSES = [
  'active',
  'inactive',
  'cancelled',
  'past_due',
  'trialing',
  'unpaid',
] as const

export const PLAN_IDS = ['free', 'starter', 'pro', 'enterprise'] as const

export const PLAN_FEATURES = {
  free: ['leads', 'contacts'],
  starter: [
    'leads',
    'contacts',
    'email_sequences',
    'campaigns',
    'whatsapp',
  ],
  pro: [
    'leads',
    'contacts',
    'email_sequences',
    'campaigns',
    'whatsapp',
    'ai_scoring',
    'social_media',
    'bot_flows',
    'deals_pipeline',
  ],
  enterprise: [
    'leads',
    'contacts',
    'email_sequences',
    'campaigns',
    'whatsapp',
    'ai_scoring',
    'social_media',
    'bot_flows',
    'deals_pipeline',
    'white_label',
    'api_access',
    'custom_roles',
  ],
} as const

export const PLAN_LIMITS = {
  free: { leads: 500, members: 3, storage: 1000, apiCalls: 1000 },
  starter: { leads: 5000, members: 10, storage: 10000, apiCalls: 5000 },
  pro: { leads: 50000, members: 25, storage: 50000, apiCalls: 50000 },
  enterprise: { leads: -1, members: -1, storage: 200000, apiCalls: 100000 },
} as const

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const

export const APPOINTMENT_TYPES = ['scheduled', 'walk_in'] as const

export const APPOINTMENT_SOURCES = [
  'manual',
  'online',
  'phone',
  'whatsapp',
] as const

export const ACTIVITY_TYPES = [
  'created',
  'updated',
  'deleted',
  'assigned',
  'status_changed',
  'note_added',
  'email_sent',
  'call_made',
  'meeting_scheduled',
] as const

export const INVITATION_STATUSES = [
  'pending',
  'accepted',
  'expired',
  'cancelled',
  'declined',
] as const

export const MEMBER_STATUSES = ['active', 'inactive', 'suspended'] as const

export const QUALITY_RATINGS = ['GREEN', 'YELLOW', 'RED'] as const

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const

export const SMS_TYPES = [
  'transactional',
  'promotional',
  'otp',
] as const

export const REMINDER_TYPES = ['email', 'sms', 'whatsapp'] as const

export const REMINDER_STATUSES = ['pending', 'sent', 'failed'] as const

export const RECURRING_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
] as const

export const ATTENDANCE_CLOCK_STATUSES = [
  'clocked_in',
  'on_break',
  'clocked_out',
  'absent',
  'late',
  'half_day',
] as const

export const WORK_TYPES = [
  'office',
  'remote',
  'hybrid',
  'field',
] as const

export const ASSET_DOCUMENT_TYPES = [
  'invoice',
  'warranty',
  'manual',
  'certificate',
  'other',
] as const

export const DEPRECIATION_METHODS = [
  'straight_line',
  'declining_balance',
  'none',
] as const

export const MILESTONE_TYPES = [
  'payment',
  'meeting',
  'contract',
  'delivery',
  'other',
] as const

export const MILESTONE_STATUSES = [
  'completed',
  'pending',
  'cancelled',
] as const

export const MESSAGE_DIRECTIONS = [
  'inbound',
  'outbound',
] as const

export const SEQUENCE_ENROLLMENT_STATUSES = [
  'active',
  'completed',
  'paused',
  'bounced',
  'unsubscribed',
] as const

export const ENTITY_TYPES = [
  'lead',
  'contact',
  'deal',
  'pipeline',
  'appointment',
  'invoice',
  'quotation',
] as const

export const WORKSPACE_MEMBER_STATUSES = [
  'pending',
  'active',
  'inactive',
  'removed',
] as const

export const WORKSPACE_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY',
  'SEK', 'NZD', 'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB',
  'INR', 'BRL', 'ZAR', 'KRW',
] as const

export const DATE_FORMATS = [
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'MM-DD-YYYY',
] as const

export const TIME_FORMATS = ['12h', '24h'] as const

export const LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
] as const

export const WORKSPACE_SUBSCRIPTION_STATUSES = [
  'active',
  'inactive',
  'cancelled',
  'past_due',
  'trialing',
] as const

export const PLAN_INTERVALS = ['month', 'year'] as const

export const LEAVE_REQUEST_TYPES = [
  'annual',
  'sick',
  'personal',
  'maternity',
  'paternity',
  'emergency',
  'bereavement',
  'study',
] as const

export const SMS_LOG_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'failed',
  'rejected',
] as const

export const REPLY_CHANNELS = ['email', 'whatsapp', 'sms'] as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const

export const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

export const PROJECT_STATUSES = ['active', 'archived', 'completed'] as const

export const PROJECT_VISIBILITY = ['workspace', 'private', 'public'] as const

export const SPRINT_STATUSES = ['planning', 'active', 'completed'] as const

export const CHAT_ROOM_TYPES = ['general', 'private', 'direct'] as const

export const MESSAGE_TYPES = ['text', 'file', 'image', 'system'] as const

export const MEETING_TYPES = ['instant', 'scheduled'] as const

export const MEETING_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const

export const NOTIFICATION_LEVELS = ['personal', 'team', 'workspace'] as const

export const NOTIFICATION_TYPES = ['info', 'success', 'warning', 'error'] as const

export const BLOG_STATUSES = ['draft', 'published', 'archived'] as const

export const BLOG_CHANGE_FREQUENCIES = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'] as const

export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const BLOG_WORDS_PER_MINUTE = 200

export const BLOG_RELATED_POSTS_LIMIT = 3

export const BLOG_DEFAULT_PAGE_SIZE = 12

export const INVOICE_STATUSES = ['draft', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'] as const

export const INVOICE_TYPES = ['tax_invoice', 'proforma', 'credit_note', 'debit_note'] as const

export const INVOICE_NUMBER_PREFIXES: Record<(typeof INVOICE_TYPES)[number], string> = {
  tax_invoice: 'INV',
  proforma: 'INV',
  credit_note: 'CN',
  debit_note: 'DN',
}

export const DISCOUNT_TYPES = ['percentage', 'flat'] as const

export const INVOICE_SEND_CHANNELS = ['email', 'whatsapp', 'sms'] as const

export const RECURRING_INTERVALS = ['weekly', 'monthly', 'quarterly', 'yearly'] as const

export const DEFAULT_GST_RATE = 18

export const DEFAULT_ITEM_UNIT = 'pcs'

export const DEFAULT_CURRENCY = 'INR'

export const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'] as const

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'upi', 'cheque', 'other'] as const

export const PRODUCT_TYPES = ['physical', 'digital', 'service'] as const

export const STOCK_MOVEMENT_TYPES = ['in', 'out', 'adjustment', 'return', 'damaged'] as const

export const DOCUMENT_STATUSES = ['draft', 'published', 'archived'] as const

export const CALENDAR_EVENT_TYPES = ['meeting', 'task', 'reminder', 'other'] as const

export const ONBOARDING_STEPS = ['profile', 'workspace', 'team', 'integrations', 'completed'] as const

export const REFERRAL_STATUSES = ['pending', 'active', 'converted', 'expired'] as const

export const ENGINE_STATUSES = ['active', 'inactive', 'error'] as const

export const WEBHOOK_STATUSES = ['active', 'inactive', 'failed'] as const

export const WEBHOOK_EVENTS = [
  'lead.created', 'lead.updated', 'lead.deleted', 'lead.converted',
  'contact.created', 'contact.updated', 'contact.deleted',
  'deal.created', 'deal.updated', 'deal.won', 'deal.lost',
  'appointment.created', 'appointment.cancelled', 'appointment.completed',
  'invoice.created', 'invoice.paid', 'invoice.overdue',
] as const

export const FMCG_BATCH_STATUSES = ['in_production', 'quality_check', 'approved', 'rejected', 'released', 'recalled'] as const

export const FMCG_COMPLAINT_STATUSES = ['open', 'investigating', 'resolved', 'closed'] as const

export const FMCG_COMPLAINT_SEVERITY = ['low', 'medium', 'high', 'critical'] as const

export const FMCG_DISTRIBUTION_STATUSES = ['pending', 'in_transit', 'delivered', 'returned'] as const

export const ATTENDEE_STATUSES = ['pending', 'accepted', 'declined'] as const

export const TEST_RESULTS = ['pass', 'fail', 'pending'] as const

export const RECALL_SEVERITY = ['class1', 'class2', 'class3'] as const

export const RECALL_STATUSES = ['initiated', 'in_progress', 'completed'] as const

export const LICENSE_STATUSES = ['active', 'expired', 'renewal_pending'] as const

export const REFERRAL_STEP_STATUSES = ['pending', 'signed_up', 'converted', 'rewarded'] as const

export const NOTIFICATION_PRIORITY = ['low', 'medium', 'high'] as const

export const LEAD_NOTE_TYPES = ['note', 'call', 'email', 'meeting', 'task'] as const

export const WEBHOOK_LOG_STATUSES = ['received', 'processed', 'failed'] as const

export const EMAIL_PROVIDERS = ['gmail', 'outlook', 'smtp'] as const

export const META_API_VERSION = 'v21.0'

export const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export const SERVICE_URLS = {
  WHATSAPP: process.env.WHATSAPP_SERVICE_URL || 'http://whatsapp-service:8004',
  MARKETING: process.env.MARKETING_SERVICE_URL || 'http://marketing-service:8007',
  SALES: process.env.SALES_SERVICE_URL || 'http://sales-service:8002',
  BILLING: process.env.BILLING_SERVICE_URL || 'http://billing-service:8006',
} as const

export const INTERNAL_KEY_HEADER = 'x-internal-key'

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export const OPENROUTER_DEFAULT_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct:free'

export const CAMPAIGN_PROCESS_INTERVAL_MS = 60 * 1000

export const DEFAULT_PIPELINE_NAME = 'Sales Pipeline'

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'New', color: '#6366f1', probability: 10 },
  { name: 'Contacted', color: '#0ea5e9', probability: 25 },
  { name: 'Qualified', color: '#f59e0b', probability: 50 },
  { name: 'Proposal', color: '#8b5cf6', probability: 75 },
  { name: 'Won', color: '#22c55e', probability: 100, isWonStage: true },
  { name: 'Lost', color: '#ef4444', probability: 0, isLostStage: true },
] as const

export const GOOGLE_OAUTH_ENDPOINTS = {
  auth: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  userinfo: 'https://www.googleapis.com/oauth2/v2/userinfo',
} as const

export const GOOGLE_LOGIN_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
] as const

export const AVATAR_MAX_SIZE = 5 * 1024 * 1024

export const BLOG_IMAGE_MAX_SIZE = 5 * 1024 * 1024

export const PROJECT_MEMBER_STATUSES = ['pending', 'active', 'inactive', 'removed'] as const

export const PROJECT_INVITATION_STATUSES = ['pending', 'accepted', 'declined', 'expired'] as const

export const PROJECT_JOIN_REQUEST_STATUSES = ['pending', 'approved', 'denied'] as const

export const PROJECT_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const EMAIL_ACCOUNT_PROVIDERS = ['gmail', 'outlook', 'smtp', 'imap'] as const

export const EMAIL_CONNECTION_STATUSES = ['connected', 'disconnected', 'expired', 'not_configured', 'error', 'testing'] as const

export const EMAIL_MESSAGE_DIRECTIONS = ['inbound', 'outbound', 'draft'] as const

export const EMAIL_MESSAGE_STATUSES = ['draft', 'sent', 'delivered', 'failed', 'bounced', 'read'] as const

export const EMAIL_PRIORITIES = ['low', 'normal', 'high'] as const

export const EMAIL_SYNC_STATUSES = ['pending', 'synced', 'failed', 'ignored'] as const

export const EMAIL_TEMPLATE_CATEGORIES = ['sales', 'marketing', 'support', 'onboarding', 'follow-up', 'custom'] as const

export const EMAIL_SYSTEM_FOLDERS = ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'STARRED'] as const

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

export const GOOGLE_OAUTH = {
  AUTHORIZE_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  TOKEN_URL: 'https://oauth2.googleapis.com/token',
  USERINFO_URL: 'https://www.googleapis.com/oauth2/v2/userinfo',
  GMAIL_API_BASE: 'https://gmail.googleapis.com/gmail/v1/users/me',
  SCOPES: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
} as const

export const MICROSOFT_OAUTH = {
  AUTHORIZE_URL: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  TOKEN_URL: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  GRAPH_API_BASE: 'https://graph.microsoft.com/v1.0',
  SCOPES: ['https://graph.microsoft.com/Mail.ReadWrite', 'https://graph.microsoft.com/Mail.Send', 'https://graph.microsoft.com/User.Read', 'offline_access'],
} as const

export const SOCIAL_OAUTH_PROVIDERS = ['linkedin', 'meta'] as const

export const LINKEDIN_OAUTH = {
  AUTHORIZE_URL: 'https://www.linkedin.com/oauth/v2/authorization',
  TOKEN_URL: 'https://www.linkedin.com/oauth/v2/accessToken',
  USERINFO_URL: 'https://api.linkedin.com/v2/userinfo',
  SCOPES: ['openid', 'profile', 'email', 'w_member_social'],
} as const

export const META_OAUTH = {
  AUTHORIZE_URL: `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`,
  TOKEN_URL: `${META_API_BASE}/oauth/access_token`,
  ME_URL: `${META_API_BASE}/me`,
  SCOPES: ['whatsapp_business_management', 'whatsapp_business_messaging', 'business_management'],
  DEFAULT_EXPIRES_IN: 5183944,
} as const

export const SOCKET_PATH = '/api/socket'

export const SOCKET_PING_TIMEOUT_MS = 60000

export const SOCKET_PING_INTERVAL_MS = 25000

export const SOCKET_ROOM_PREFIX = {
  WORKSPACE: 'workspace:',
  CHAT: 'chat:',
  DOCUMENT: 'doc:',
} as const

export const SOCKET_CLIENT_EVENTS = {
  IDENTIFY_USER: 'identify-user',
  JOIN_CHAT: 'join-chat',
  LEAVE_CHAT: 'leave-chat',
  SEND_MESSAGE: 'send-message',
  ADD_REACTION: 'add-reaction',
  DELETE_MESSAGE: 'delete-message',
  TYPING_START: 'typing-start',
  TYPING_STOP: 'typing-stop',
  MARK_MESSAGES_READ: 'mark-messages-read',
  USER_STATUS_CHANGE: 'user-status-change',
  CALL_INITIATE: 'call-initiate',
  CALL_ACCEPT: 'call-accept',
  CALL_REJECT: 'call-reject',
  CALL_END: 'call-end',
  WEBRTC_OFFER: 'webrtc-offer',
  WEBRTC_ANSWER: 'webrtc-answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc-ice-candidate',
  DOC_JOIN: 'doc-join',
  DOC_LEAVE: 'doc-leave',
  DOC_UPDATE: 'doc-update',
  DOC_AWARENESS: 'doc-awareness',
} as const

export const SOCKET_SERVER_EVENTS = {
  ERROR: 'error',
  USER_IDENTIFIED: 'user-identified',
  JOINED_CHAT: 'joined-chat',
  NEW_MESSAGE: 'new-message',
  MESSAGE_REACTION_ADDED: 'message-reaction-added',
  MESSAGE_DELETED: 'message-deleted',
  USER_TYPING: 'user-typing',
  USER_STOPPED_TYPING: 'user-stopped-typing',
  MESSAGES_READ: 'messages-read',
  USER_STATUS_UPDATED: 'user-status-updated',
  USER_JOINED_ROOM: 'user-joined-room',
  USER_LEFT_ROOM: 'user-left-room',
  CALL_INCOMING: 'call-incoming',
  CALL_ACCEPTED: 'call-accepted',
  CALL_REJECTED: 'call-rejected',
  CALL_ENDED: 'call-ended',
  WEBRTC_OFFER: 'webrtc-offer',
  WEBRTC_ANSWER: 'webrtc-answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc-ice-candidate',
  DOC_USER_JOINED: 'doc-user-joined',
  DOC_USER_LEFT: 'doc-user-left',
  DOC_UPDATE: 'doc-update',
  DOC_AWARENESS: 'doc-awareness',
} as const

export const CASHFREE_API_VERSION = '2023-08-01'

export const CASHFREE_BASE_URLS = {
  sandbox: 'https://sandbox.cashfree.com/pg',
  production: 'https://api.cashfree.com/pg',
} as const

export const CASHFREE_ENVIRONMENTS = ['sandbox', 'production'] as const

export const CASHFREE_WEBHOOK_EVENTS = {
  PAYMENT_SUCCESS: ['PAYMENT_SUCCESS_WEBHOOK', 'PAYMENT_SUCCESS'],
  PAYMENT_FAILED: ['PAYMENT_FAILED_WEBHOOK', 'PAYMENT_FAILED'],
  PAYMENT_DROPPED: ['PAYMENT_USER_DROPPED_WEBHOOK'],
  REFUND: ['REFUND_STATUS_WEBHOOK'],
} as const

export const CASHFREE_SUBSCRIPTION_API_VERSION = '2025-01-01'

export const CASHFREE_SUBSCRIPTION_PATHS = {
  PLANS: '/plans',
  SUBSCRIPTIONS: '/subscriptions',
} as const

export const CASHFREE_PLAN_TYPES = { PERIODIC: 'PERIODIC', ON_DEMAND: 'ON_DEMAND' } as const

export const CASHFREE_PLAN_INTERVAL_TYPES = { month: 'MONTH', year: 'YEAR' } as const

export const CASHFREE_PLAN_ID_PREFIX = 'crm'

export const CASHFREE_SUBSCRIPTION_ID_PREFIX = 'sub'

export const CASHFREE_SUBSCRIPTION_ACTIONS = {
  CANCEL: 'CANCEL',
  PAUSE: 'PAUSE',
  ACTIVATE: 'ACTIVATE',
  CHANGE_PLAN: 'CHANGE_PLAN',
} as const

export const CASHFREE_SUBSCRIPTION_STATUSES = {
  INITIALIZED: 'INITIALIZED',
  BANK_APPROVAL_PENDING: 'BANK_APPROVAL_PENDING',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  CUSTOMER_PAUSED: 'CUSTOMER_PAUSED',
  CANCELLED: 'CANCELLED',
  CUSTOMER_CANCELLED: 'CUSTOMER_CANCELLED',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  LINK_EXPIRED: 'LINK_EXPIRED',
  CARD_EXPIRED: 'CARD_EXPIRED',
} as const

export const CASHFREE_SUBSCRIPTION_ENDED_STATUSES = [
  'CANCELLED',
  'CUSTOMER_CANCELLED',
  'COMPLETED',
  'EXPIRED',
  'LINK_EXPIRED',
  'CARD_EXPIRED',
] as const

export const CASHFREE_SUBSCRIPTION_HOLD_STATUSES = ['ON_HOLD', 'CUSTOMER_PAUSED'] as const

export const CASHFREE_AUTH_SUCCESS_STATUSES = ['SUCCESS', 'ACTIVE', 'APPROVED'] as const

export const CASHFREE_SUBSCRIPTION_WEBHOOK_EVENTS = {
  STATUS_CHANGE: ['SUBSCRIPTION_STATUS_CHANGE', 'SUBSCRIPTION_STATUS_CHANGED'],
  AUTH_STATUS: ['SUBSCRIPTION_AUTH_STATUS'],
  PAYMENT_SUCCESS: ['SUBSCRIPTION_PAYMENT_SUCCESS', 'SUBSCRIPTION_NEW_PAYMENT', 'SUBSCRIPTION_CHARGED'],
  PAYMENT_FAILED: ['SUBSCRIPTION_PAYMENT_FAILED', 'SUBSCRIPTION_PAYMENT_CANCELLED'],
  REFUND: ['SUBSCRIPTION_REFUND_STATUS'],
} as const

export const CASHFREE_SUBSCRIPTION_PAYMENT_METHODS = ['upi', 'card', 'enach'] as const

export const CASHFREE_SUBSCRIPTION_EXPIRY_YEARS = 5

export const CASHFREE_IST_OFFSET = '+05:30'

export const CASHFREE_IST_OFFSET_MS = 330 * 60 * 1000

export const CASHFREE_SUBSCRIPTION_NOTIFICATION_CHANNELS = ['EMAIL'] as const

export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 3

export const SUBSCRIPTION_RECONCILE_INTERVAL_MS = 24 * 60 * 60 * 1000

export const BILLING_CHECKOUT_TYPES = { SUBSCRIPTION: 'subscription', ORDER: 'order' } as const

export const CASHFREE_PAYMENT_SUCCESS_STATUS = 'SUCCESS'

export const CASHFREE_WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature'

export const CASHFREE_WEBHOOK_TIMESTAMP_HEADER = 'x-webhook-timestamp'

export const CASHFREE_WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000

export const CASHFREE_DEFAULT_CUSTOMER_PHONE = '9999999999'

export const FREE_PLAN_ID = 'free'

export const PLAN_LIMIT_UNLIMITED = -1

export const PLAN_LIMIT_REACHED_CODE = 'PLAN_LIMIT_REACHED'

export const SUBSCRIPTION_PERIOD_DAYS = { month: 30, year: 365 } as const

export const DEFAULT_PLAN_CURRENCY = 'INR'

export const DEFAULT_PLANS = [
  {
    _id: 'free',
    name: 'Free',
    description: '3 members · 500 leads',
    price: 0,
    currency: 'INR',
    interval: 'month',
    features: ['Up to 500 leads', '3 team members', 'Basic pipeline', '5 projects · 50 tasks', 'Team chat (30 days)'],
    limits: { leads: 500, members: 3, storage: 1000, apiCalls: 1000 },
    sortOrder: 0,
    isActive: true,
  },
  {
    _id: 'starter',
    name: 'Starter',
    description: '10 members · 5K leads',
    price: 999,
    currency: 'INR',
    interval: 'month',
    features: [
      'Up to 5,000 leads',
      '10 team members',
      'Full pipeline + statuses',
      '15 projects · unlimited tasks',
      'Team chat (full history)',
      'Email (1 account)',
      'Basic HR',
    ],
    limits: { leads: 5000, members: 10, storage: 10000, apiCalls: 5000 },
    sortOrder: 1,
    isActive: true,
  },
  {
    _id: 'pro',
    name: 'Pro',
    description: '25 members · 50K leads',
    price: 2499,
    currency: 'INR',
    interval: 'month',
    features: [
      'Up to 50,000 leads',
      '25 team members',
      'AI scoring + pipelines',
      'Unlimited projects + time tracking',
      'Chat + doc collaboration',
      'Email (3 accounts)',
      'Full HR suite',
      'AI engine (500 credits)',
    ],
    limits: { leads: 50000, members: 25, storage: 50000, apiCalls: 50000 },
    sortOrder: 2,
    isActive: true,
  },
  {
    _id: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited everything',
    price: 7999,
    currency: 'INR',
    interval: 'month',
    features: [
      'Unlimited leads',
      'Unlimited team members',
      'Everything in Pro',
      'Unlimited AI credits',
      'SSO / SAML',
      'API access',
      'Dedicated account manager',
    ],
    limits: { leads: -1, members: -1, storage: 200000, apiCalls: 100000 },
    sortOrder: 3,
    isActive: true,
  },
] as const
