"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORK_TYPES = exports.ATTENDANCE_CLOCK_STATUSES = exports.RECURRING_FREQUENCIES = exports.REMINDER_STATUSES = exports.REMINDER_TYPES = exports.SMS_TYPES = exports.CURRENCIES = exports.QUALITY_RATINGS = exports.MEMBER_STATUSES = exports.INVITATION_STATUSES = exports.ACTIVITY_TYPES = exports.APPOINTMENT_SOURCES = exports.APPOINTMENT_TYPES = exports.APPOINTMENT_STATUSES = exports.PLAN_LIMITS = exports.PLAN_FEATURES = exports.PLAN_IDS = exports.SUBSCRIPTION_STATUSES = exports.SOCIAL_POST_STATUSES = exports.SOCIAL_PLATFORMS = exports.BOT_MATCH_TYPES = exports.BOT_TONE = exports.BOT_FLOW_STEP_TYPES = exports.CONVERSATION_STATUSES = exports.CONVERSATION_MODES = exports.WHATSAPP_BUTTON_TYPES = exports.WHATSAPP_HEADER_TYPES = exports.WHATSAPP_TEMPLATE_CATEGORIES = exports.WHATSAPP_TEMPLATE_STATUSES = exports.WHATSAPP_PROVIDERS = exports.WHATSAPP_MESSAGE_STATUSES = exports.WHATSAPP_MESSAGE_TYPES = exports.SEQUENCE_STATUSES = exports.ENROLLMENT_STATUSES = exports.CAMPAIGN_STATUSES = exports.CAMPAIGN_CHANNELS = exports.SHIFT_TYPES = exports.ATTENDANCE_STATUSES = exports.LEAVE_STATUSES = exports.LEAVE_TYPES = exports.CONTACT_STATUSES = exports.CONTACT_CATEGORIES = exports.DEAL_STATUSES = exports.DEAL_PRIORITIES = exports.LEAD_PRIORITIES = exports.LEAD_SOURCES = exports.ASSET_CONDITION = exports.ASSET_STATUS = exports.ASSET_TYPES = exports.NODE_ENVS = void 0;
exports.RECALL_STATUSES = exports.RECALL_SEVERITY = exports.TEST_RESULTS = exports.ATTENDEE_STATUSES = exports.FMCG_DISTRIBUTION_STATUSES = exports.FMCG_COMPLAINT_SEVERITY = exports.FMCG_COMPLAINT_STATUSES = exports.FMCG_BATCH_STATUSES = exports.WEBHOOK_EVENTS = exports.WEBHOOK_STATUSES = exports.ENGINE_STATUSES = exports.REFERRAL_STATUSES = exports.ONBOARDING_STEPS = exports.CALENDAR_EVENT_TYPES = exports.DOCUMENT_STATUSES = exports.STOCK_MOVEMENT_TYPES = exports.PRODUCT_TYPES = exports.PAYMENT_METHODS = exports.QUOTATION_STATUSES = exports.INVOICE_STATUSES = exports.BLOG_STATUSES = exports.NOTIFICATION_TYPES = exports.NOTIFICATION_LEVELS = exports.MEETING_STATUSES = exports.MEETING_TYPES = exports.MESSAGE_TYPES = exports.CHAT_ROOM_TYPES = exports.SPRINT_STATUSES = exports.PROJECT_VISIBILITY = exports.PROJECT_STATUSES = exports.TASK_PRIORITIES = exports.TASK_STATUSES = exports.HTTP_STATUS = exports.REPLY_CHANNELS = exports.SMS_LOG_STATUSES = exports.LEAVE_REQUEST_TYPES = exports.PLAN_INTERVALS = exports.WORKSPACE_SUBSCRIPTION_STATUSES = exports.LANGUAGES = exports.TIME_FORMATS = exports.DATE_FORMATS = exports.WORKSPACE_CURRENCIES = exports.WORKSPACE_MEMBER_STATUSES = exports.ENTITY_TYPES = exports.SEQUENCE_ENROLLMENT_STATUSES = exports.MESSAGE_DIRECTIONS = exports.MILESTONE_STATUSES = exports.MILESTONE_TYPES = exports.DEPRECIATION_METHODS = exports.ASSET_DOCUMENT_TYPES = void 0;
exports.EMAIL_PROVIDERS = exports.WEBHOOK_LOG_STATUSES = exports.LEAD_NOTE_TYPES = exports.NOTIFICATION_PRIORITY = exports.REFERRAL_STEP_STATUSES = exports.LICENSE_STATUSES = void 0;
exports.NODE_ENVS = {
    PRODUCTION: 'production',
    DEVELOPMENT: 'development',
    TEST: 'test',
};
exports.ASSET_TYPES = [
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
];
exports.ASSET_STATUS = [
    'available',
    'assigned',
    'maintenance',
    'retired',
    'lost',
];
exports.ASSET_CONDITION = [
    'new',
    'good',
    'fair',
    'poor',
    'damaged',
];
exports.LEAD_SOURCES = [
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
];
exports.LEAD_PRIORITIES = ['low', 'medium', 'high'];
exports.DEAL_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
exports.DEAL_STATUSES = ['open', 'won', 'lost', 'abandoned'];
exports.CONTACT_CATEGORIES = [
    'client',
    'prospect',
    'partner',
    'vendor',
    'other',
];
exports.CONTACT_STATUSES = ['active', 'inactive', 'archived'];
exports.LEAVE_TYPES = [
    'casual',
    'sick',
    'earned',
    'maternity',
    'paternity',
    'unpaid',
    'compensatory',
    'bereavement',
];
exports.LEAVE_STATUSES = [
    'pending',
    'approved',
    'rejected',
    'cancelled',
];
exports.ATTENDANCE_STATUSES = [
    'present',
    'absent',
    'half_day',
    'late',
    'on_leave',
    'holiday',
    'weekend',
];
exports.SHIFT_TYPES = [
    'morning',
    'afternoon',
    'night',
    'flexible',
    'split',
];
exports.CAMPAIGN_CHANNELS = [
    'email',
    'whatsapp',
    'sms',
    'ai_reply',
];
exports.CAMPAIGN_STATUSES = [
    'draft',
    'active',
    'paused',
    'completed',
];
exports.ENROLLMENT_STATUSES = [
    'active',
    'completed',
    'paused',
    'failed',
    'unsubscribed',
];
exports.SEQUENCE_STATUSES = ['draft', 'active', 'paused'];
exports.WHATSAPP_MESSAGE_TYPES = [
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
];
exports.WHATSAPP_MESSAGE_STATUSES = [
    'pending',
    'sent',
    'delivered',
    'read',
    'failed',
];
exports.WHATSAPP_PROVIDERS = ['meta_cloud', 'wati', 'gupshup'];
exports.WHATSAPP_TEMPLATE_STATUSES = [
    'APPROVED',
    'PENDING',
    'REJECTED',
];
exports.WHATSAPP_TEMPLATE_CATEGORIES = [
    'MARKETING',
    'UTILITY',
    'AUTHENTICATION',
];
exports.WHATSAPP_HEADER_TYPES = [
    'NONE',
    'TEXT',
    'IMAGE',
    'DOCUMENT',
    'VIDEO',
];
exports.WHATSAPP_BUTTON_TYPES = [
    'QUICK_REPLY',
    'URL',
    'PHONE_NUMBER',
];
exports.CONVERSATION_MODES = [
    'ai',
    'human',
    'workflow',
    'idle',
];
exports.CONVERSATION_STATUSES = [
    'active',
    'closed',
    'archived',
];
exports.BOT_FLOW_STEP_TYPES = [
    'send_message',
    'wait_for_reply',
    'keyword_match',
    'quick_reply',
    'list_message',
    'ai_reply',
    'assign_human',
    'delay',
    'condition',
];
exports.BOT_TONE = ['professional', 'friendly', 'casual'];
exports.BOT_MATCH_TYPES = ['exact', 'contains', 'regex'];
exports.SOCIAL_PLATFORMS = [
    'facebook',
    'instagram',
    'linkedin',
    'twitter',
];
exports.SOCIAL_POST_STATUSES = [
    'draft',
    'scheduled',
    'publishing',
    'published',
    'failed',
];
exports.SUBSCRIPTION_STATUSES = [
    'active',
    'inactive',
    'cancelled',
    'past_due',
    'trialing',
    'unpaid',
];
exports.PLAN_IDS = ['free', 'starter', 'pro', 'enterprise'];
exports.PLAN_FEATURES = {
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
};
exports.PLAN_LIMITS = {
    free: { leads: 500, members: 3, storage: 1000, apiCalls: 1000 },
    starter: { leads: 5000, members: 10, storage: 10000, apiCalls: 5000 },
    pro: { leads: 50000, members: 25, storage: 50000, apiCalls: 50000 },
    enterprise: { leads: -1, members: -1, storage: 200000, apiCalls: 100000 },
};
exports.APPOINTMENT_STATUSES = [
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
];
exports.APPOINTMENT_TYPES = ['scheduled', 'walk_in'];
exports.APPOINTMENT_SOURCES = [
    'manual',
    'online',
    'phone',
    'whatsapp',
];
exports.ACTIVITY_TYPES = [
    'created',
    'updated',
    'deleted',
    'assigned',
    'status_changed',
    'note_added',
    'email_sent',
    'call_made',
    'meeting_scheduled',
];
exports.INVITATION_STATUSES = [
    'pending',
    'accepted',
    'expired',
    'cancelled',
];
exports.MEMBER_STATUSES = ['active', 'inactive', 'suspended'];
exports.QUALITY_RATINGS = ['GREEN', 'YELLOW', 'RED'];
exports.CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
exports.SMS_TYPES = [
    'transactional',
    'promotional',
    'otp',
];
exports.REMINDER_TYPES = ['email', 'sms', 'whatsapp'];
exports.REMINDER_STATUSES = ['pending', 'sent', 'failed'];
exports.RECURRING_FREQUENCIES = [
    'daily',
    'weekly',
    'monthly',
];
exports.ATTENDANCE_CLOCK_STATUSES = [
    'clocked_in',
    'on_break',
    'clocked_out',
    'absent',
    'late',
    'half_day',
];
exports.WORK_TYPES = [
    'office',
    'remote',
    'hybrid',
    'field',
];
exports.ASSET_DOCUMENT_TYPES = [
    'invoice',
    'warranty',
    'manual',
    'certificate',
    'other',
];
exports.DEPRECIATION_METHODS = [
    'straight_line',
    'declining_balance',
    'none',
];
exports.MILESTONE_TYPES = [
    'payment',
    'meeting',
    'contract',
    'delivery',
    'other',
];
exports.MILESTONE_STATUSES = [
    'completed',
    'pending',
    'cancelled',
];
exports.MESSAGE_DIRECTIONS = [
    'inbound',
    'outbound',
];
exports.SEQUENCE_ENROLLMENT_STATUSES = [
    'active',
    'completed',
    'paused',
    'bounced',
    'unsubscribed',
];
exports.ENTITY_TYPES = [
    'lead',
    'contact',
    'deal',
    'pipeline',
    'appointment',
];
exports.WORKSPACE_MEMBER_STATUSES = [
    'pending',
    'active',
    'inactive',
    'removed',
];
exports.WORKSPACE_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY',
    'SEK', 'NZD', 'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB',
    'INR', 'BRL', 'ZAR', 'KRW',
];
exports.DATE_FORMATS = [
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'YYYY-MM-DD',
    'DD-MM-YYYY',
    'MM-DD-YYYY',
];
exports.TIME_FORMATS = ['12h', '24h'];
exports.LANGUAGES = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
];
exports.WORKSPACE_SUBSCRIPTION_STATUSES = [
    'active',
    'inactive',
    'cancelled',
    'past_due',
    'trialing',
];
exports.PLAN_INTERVALS = ['month', 'year'];
exports.LEAVE_REQUEST_TYPES = [
    'annual',
    'sick',
    'personal',
    'maternity',
    'paternity',
    'emergency',
    'bereavement',
    'study',
];
exports.SMS_LOG_STATUSES = [
    'pending',
    'sent',
    'delivered',
    'failed',
    'rejected',
];
exports.REPLY_CHANNELS = ['email', 'whatsapp', 'sms'];
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
};
exports.TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done'];
exports.TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
exports.PROJECT_STATUSES = ['active', 'archived', 'completed'];
exports.PROJECT_VISIBILITY = ['workspace', 'private', 'public'];
exports.SPRINT_STATUSES = ['planning', 'active', 'completed'];
exports.CHAT_ROOM_TYPES = ['general', 'private', 'direct'];
exports.MESSAGE_TYPES = ['text', 'file', 'image', 'system'];
exports.MEETING_TYPES = ['instant', 'scheduled'];
exports.MEETING_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];
exports.NOTIFICATION_LEVELS = ['personal', 'team', 'workspace'];
exports.NOTIFICATION_TYPES = ['info', 'success', 'warning', 'error'];
exports.BLOG_STATUSES = ['draft', 'published', 'archived'];
exports.INVOICE_STATUSES = ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'];
exports.QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'];
exports.PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'upi', 'cheque', 'other'];
exports.PRODUCT_TYPES = ['physical', 'digital', 'service'];
exports.STOCK_MOVEMENT_TYPES = ['in', 'out', 'adjustment', 'return', 'damaged'];
exports.DOCUMENT_STATUSES = ['draft', 'published', 'archived'];
exports.CALENDAR_EVENT_TYPES = ['meeting', 'task', 'reminder', 'other'];
exports.ONBOARDING_STEPS = ['profile', 'workspace', 'team', 'integrations', 'completed'];
exports.REFERRAL_STATUSES = ['pending', 'active', 'converted', 'expired'];
exports.ENGINE_STATUSES = ['active', 'inactive', 'error'];
exports.WEBHOOK_STATUSES = ['active', 'inactive', 'failed'];
exports.WEBHOOK_EVENTS = [
    'lead.created', 'lead.updated', 'lead.deleted', 'lead.converted',
    'contact.created', 'contact.updated', 'contact.deleted',
    'deal.created', 'deal.updated', 'deal.won', 'deal.lost',
    'appointment.created', 'appointment.cancelled', 'appointment.completed',
    'invoice.created', 'invoice.paid', 'invoice.overdue',
];
exports.FMCG_BATCH_STATUSES = ['in_production', 'quality_check', 'approved', 'rejected', 'released', 'recalled'];
exports.FMCG_COMPLAINT_STATUSES = ['open', 'investigating', 'resolved', 'closed'];
exports.FMCG_COMPLAINT_SEVERITY = ['low', 'medium', 'high', 'critical'];
exports.FMCG_DISTRIBUTION_STATUSES = ['pending', 'in_transit', 'delivered', 'returned'];
exports.ATTENDEE_STATUSES = ['pending', 'accepted', 'declined'];
exports.TEST_RESULTS = ['pass', 'fail', 'pending'];
exports.RECALL_SEVERITY = ['class1', 'class2', 'class3'];
exports.RECALL_STATUSES = ['initiated', 'in_progress', 'completed'];
exports.LICENSE_STATUSES = ['active', 'expired', 'renewal_pending'];
exports.REFERRAL_STEP_STATUSES = ['pending', 'signed_up', 'converted', 'rewarded'];
exports.NOTIFICATION_PRIORITY = ['low', 'medium', 'high'];
exports.LEAD_NOTE_TYPES = ['note', 'call', 'email', 'meeting', 'task'];
exports.WEBHOOK_LOG_STATUSES = ['received', 'processed', 'failed'];
exports.EMAIL_PROVIDERS = ['gmail', 'outlook', 'smtp'];
