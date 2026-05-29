export type PipelineStage =
  | 'new_lead'
  | 'attempted'
  | 'connected'
  | 'interested'
  | 'demo_sent'
  | 'proposal_made'
  | 'committed'
  | 'building'
  | 'closed_won'
  | 'closed_lost'
  | 'not_interested'
  | 'call_back_later'

export type DncStatus = 'clear' | 'flagged' | 'unknown' | 'manual_check'

export type ScanStatus = 'running' | 'completed' | 'failed'

export type CallOutcome =
  | 'no_answer'
  | 'voicemail'
  | 'interested'
  | 'not_interested'
  | 'call_back'
  | 'wrong_number'
  | 'disconnected'
  | 'closed'

export type ReminderType = 'call' | 'follow_up' | 'demo_review'

export type BusinessHoursStatus = 'good' | 'early_late' | 'closed'

export type ScoreTier = 'hot' | 'warm' | 'cold'

export interface User {
  id: string
  email: string
  full_name: string | null
  created_at: string
  settings: UserSettings
}

export interface UserSettings {
  morning_briefing_enabled?: boolean
  morning_briefing_time?: string
  weekly_digest_enabled?: boolean
  weekly_digest_day?: string
  sms_enabled?: boolean
  sms_phone?: string
  timezone?: string
  call_script?: string
  email_template_intro?: EmailTemplate
  email_template_followup?: EmailTemplate
  email_template_demo?: EmailTemplate
  api_keys?: ApiKeys
}

export interface EmailTemplate {
  subject: string
  body: string
}

export interface ApiKeys {
  google?: string
  yelp?: string
  apify?: string
  resend?: string
  twilio_sid?: string
  twilio_token?: string
  twilio_phone?: string
  hunter?: string
}

export interface Lead {
  id: string
  user_id: string
  scan_id: string | null
  business_name: string
  category: string | null
  address: string | null
  city: string | null
  state_province: string | null
  country: string | null
  country_code: string | null
  timezone: string | null
  phone: string | null
  phone_source: string | null
  email: string | null
  rating: number | null
  review_count: number
  has_website: boolean
  website_url: string | null
  lead_score: number
  pipeline_stage: PipelineStage
  platforms_found_on: string[]
  platform_profile_urls: Record<string, string>
  google_place_id: string | null
  yelp_id: string | null
  facebook_url: string | null
  notes: string | null
  demo_url: string | null
  demo_built_at: string | null
  demo_sent_at: string | null
  demo_reviewed_by_client: boolean
  proposal_package: string | null
  proposal_price: number | null
  proposal_sent_at: string | null
  commitment_fee_received: boolean
  commitment_fee_amount: number | null
  deal_value: number | null
  dnc_checked: boolean
  dnc_status: DncStatus
  last_contacted_at: string | null
  next_call_at: string | null
  stage_updated_at: string
  created_at: string
  updated_at: string
}

export interface Scan {
  id: string
  user_id: string
  created_at: string
  completed_at: string | null
  filters: ScanFilters
  status: ScanStatus
  total_found: number
  duplicates_merged: number
  platforms_searched: string[]
}

export interface ScanFilters {
  countries: string[]
  states?: string
  cities?: string
  platforms: string[]
  category: string
  min_rating: number
  min_reviews: number
  must_have_phone: boolean
  no_website: boolean
  has_social_no_website: boolean
  claimed_only: boolean
  result_count: number
  min_lead_score: number
  exclude_existing: boolean
}

export interface CallLog {
  id: string
  lead_id: string
  user_id: string
  called_at: string
  duration_seconds: number | null
  outcome: CallOutcome
  notes: string | null
  follow_up_at: string | null
}

export interface Reminder {
  id: string
  lead_id: string
  user_id: string
  scheduled_for: string
  reminder_type: ReminderType
  message: string | null
  sent_email: boolean
  sent_sms: boolean
  created_at: string
}

export interface FilterPreset {
  id: string
  user_id: string
  name: string
  filters: ScanFilters
  created_at: string
}

export interface EmailLog {
  id: string
  lead_id: string
  user_id: string
  sent_at: string
  subject: string | null
  template: string | null
  to_email: string | null
  status: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ScanProgress {
  leadsFound: number
  duplicatesMerged: number
  platformsComplete: string[]
  platformsError: string[]
  status: ScanStatus
}
