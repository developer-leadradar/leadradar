-- LeadRadar Initial Schema
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  settings      JSONB DEFAULT '{}'
);

-- ============================================================
-- SCANS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  filters             JSONB NOT NULL,
  status              TEXT CHECK (status IN ('running','completed','failed')) DEFAULT 'running',
  total_found         INTEGER DEFAULT 0,
  duplicates_merged   INTEGER DEFAULT 0,
  platforms_searched  TEXT[]
);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scan_id                     UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  business_name               TEXT NOT NULL,
  category                    TEXT,
  address                     TEXT,
  city                        TEXT,
  state_province              TEXT,
  country                     TEXT,
  country_code                TEXT,
  timezone                    TEXT,
  phone                       TEXT,
  phone_source                TEXT,
  email                       TEXT,
  rating                      DECIMAL(2,1),
  review_count                INTEGER DEFAULT 0,
  has_website                 BOOLEAN DEFAULT FALSE,
  website_url                 TEXT,
  lead_score                  INTEGER DEFAULT 0,
  pipeline_stage              TEXT DEFAULT 'new_lead',
  platforms_found_on          TEXT[],
  platform_profile_urls       JSONB DEFAULT '{}',
  google_place_id             TEXT,
  yelp_id                     TEXT,
  facebook_url                TEXT,
  notes                       TEXT,
  demo_url                    TEXT,
  demo_built_at               TIMESTAMPTZ,
  demo_sent_at                TIMESTAMPTZ,
  demo_reviewed_by_client     BOOLEAN DEFAULT FALSE,
  proposal_package            TEXT,
  proposal_price              DECIMAL(10,2),
  proposal_sent_at            TIMESTAMPTZ,
  commitment_fee_received     BOOLEAN DEFAULT FALSE,
  commitment_fee_amount       DECIMAL(10,2),
  deal_value                  DECIMAL(10,2),
  dnc_checked                 BOOLEAN DEFAULT FALSE,
  dnc_status                  TEXT DEFAULT 'unknown',
  last_contacted_at           TIMESTAMPTZ,
  next_call_at                TIMESTAMPTZ,
  stage_updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS leads_name_trgm_idx ON public.leads USING GIN (business_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS leads_user_stage_idx ON public.leads (user_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS leads_user_score_idx ON public.leads (user_id, lead_score DESC);
CREATE INDEX IF NOT EXISTS leads_next_call_idx ON public.leads (user_id, next_call_at);

-- ============================================================
-- CALL LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.call_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  called_at         TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds  INTEGER,
  outcome           TEXT CHECK (outcome IN (
                      'no_answer','voicemail','interested','not_interested',
                      'call_back','wrong_number','disconnected','closed'
                    )),
  notes             TEXT,
  follow_up_at      TIMESTAMPTZ
);

-- ============================================================
-- REMINDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scheduled_for   TIMESTAMPTZ NOT NULL,
  reminder_type   TEXT CHECK (reminder_type IN ('call','follow_up','demo_review')),
  message         TEXT,
  sent_email      BOOLEAN DEFAULT FALSE,
  sent_sms        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FILTER PRESETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.filter_presets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  filters     JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMAIL OUTREACH LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  subject     TEXT,
  template    TEXT,
  to_email    TEXT,
  status      TEXT DEFAULT 'sent'
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own profile" ON public.users
  FOR ALL USING (auth.uid() = id);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own leads" ON public.leads
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own scans" ON public.scans
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own call logs" ON public.call_logs
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own reminders" ON public.reminders
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.filter_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own filter presets" ON public.filter_presets
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own email logs" ON public.email_logs
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own audit log" ON public.audit_log
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- HELPER FUNCTION FOR FUZZY DUPLICATE DETECTION
-- ============================================================
CREATE OR REPLACE FUNCTION find_similar_lead(
  p_user_id UUID,
  p_business_name TEXT,
  p_city TEXT,
  p_country_code TEXT,
  p_threshold FLOAT DEFAULT 0.75
)
RETURNS SETOF public.leads
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM public.leads
  WHERE user_id = p_user_id
    AND city ILIKE p_city
    AND country_code = p_country_code
    AND similarity(lower(business_name), lower(p_business_name)) > p_threshold
  ORDER BY similarity(lower(business_name), lower(p_business_name)) DESC
  LIMIT 1;
$$;

-- ============================================================
-- TRIGGER: auto-update updated_at on leads
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: auto-create user profile on auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
