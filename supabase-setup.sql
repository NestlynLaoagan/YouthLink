-- ============================================================
-- BarangayConnect – Complete Supabase Setup
-- Run this ENTIRE script in Supabase SQL Editor
-- Project: https://gbsjcdbjuzvywpqyolaa.supabase.co
-- ============================================================

-- ── TABLES ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID UNIQUE,
  email       TEXT,
  name        TEXT,
  role        TEXT DEFAULT 'resident',  -- 'resident' | 'admin' | 'super_admin'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID UNIQUE,
  -- Full name parts
  name                   TEXT,
  given_name             TEXT,
  middle_name            TEXT,
  last_name              TEXT,
  -- Contact
  email                  TEXT,
  contact_number         TEXT,
  -- Address parts
  address                TEXT,
  -- Personal
  birthday               DATE,
  age                    INTEGER,
  gender                 TEXT,
  -- Demographics
  civil_status           TEXT,
  work_status            TEXT,
  youth_age_group        TEXT,
  youth_classification   TEXT,
  youth_spec             TEXT,
  educational_background TEXT,
  -- Voting
  registered_sk_voter    BOOLEAN DEFAULT FALSE,
  voted_last_election    BOOLEAN DEFAULT FALSE,
  national_voter         BOOLEAN DEFAULT FALSE,
  -- Verification
  id_front_url           TEXT,
  id_back_url            TEXT,
  verification_id_url    TEXT,  -- legacy single-image field
  id_submitted_at        TIMESTAMPTZ,
  verification_status    TEXT DEFAULT 'Unverified',
  -- 'Unverified' | 'Pending' | 'Verified' | 'Declined'
  decline_reason         TEXT,
  -- Profile
  profile_picture        TEXT,
  profile_completed      BOOLEAN DEFAULT FALSE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  location    TEXT,
  date_time   TIMESTAMPTZ,
  type        TEXT DEFAULT 'General',   -- General | Event | Emergency | Notice
  status      TEXT DEFAULT 'Upcoming', -- Upcoming | Ongoing | Cancelled | Finished
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name     TEXT NOT NULL,
  description      TEXT,
  status           TEXT DEFAULT 'planning', -- planning | ongoing | on hold | completed
  budget           NUMERIC,
  start_date       TIMESTAMPTZ,
  end_date         TIMESTAMPTZ,
  completion_date  TIMESTAMPTZ,
  images           TEXT[] DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  start_date  TIMESTAMPTZ,
  end_date    TIMESTAMPTZ,
  status      TEXT DEFAULT 'Planning', -- Planning | Ongoing | Cancelled | Completed
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID,
  resident_name  TEXT,
  subject        TEXT,
  rating         TEXT,  -- good | average | bad
  message        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question    TEXT,
  answer      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID,
  user_name   TEXT,
  user_role   TEXT,
  action      TEXT,
  module      TEXT,
  description TEXT,
  status      TEXT DEFAULT 'Success',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────

ALTER TABLE user_roles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback      ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs    ENABLE ROW LEVEL SECURITY;

-- Open policies — allow all authenticated and anonymous access
-- (Safe for development; tighten in production)
DO $$ BEGIN CREATE POLICY "allow_all_user_roles"    ON user_roles    FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_profiles"      ON profiles      FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_announcements" ON announcements FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_projects"      ON projects      FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_events"        ON events        FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_feedback"      ON feedback      FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_faqs"          ON faqs          FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_audit_logs"    ON audit_logs    FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── STORAGE BUCKET POLICIES ──────────────────────────────────
-- Run AFTER creating buckets in Supabase Storage dashboard

DO $$ BEGIN CREATE POLICY "allow_all_verification_ids" ON storage.objects FOR ALL USING (bucket_id = 'verification-ids') WITH CHECK (bucket_id = 'verification-ids'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_project_images"   ON storage.objects FOR ALL USING (bucket_id = 'project-images')   WITH CHECK (bucket_id = 'project-images');   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_profile_pictures" ON storage.objects FOR ALL USING (bucket_id = 'profile-pictures') WITH CHECK (bucket_id = 'profile-pictures'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── SAMPLE DATA ──────────────────────────────────────────────

INSERT INTO faqs (question, answer) VALUES
  ('What are the barangay office hours?',   'The barangay office is open Monday to Friday, 8:00 AM to 5:00 PM.'),
  ('How do I get a barangay clearance?',    'Visit the barangay hall with a valid ID. The clearance fee is ₱50. Processing takes 1–2 working days.'),
  ('When is the next SK event?',            'Check the Events section on the BarangayConnect dashboard for upcoming SK events and schedules.'),
  ('How do I register as an SK voter?',     'Visit the COMELEC office or barangay hall during voter registration period with a valid government-issued ID.'),
  ('How do I submit a complaint or report?','Use the Report button on the dashboard or visit the barangay hall directly. All reports are treated with confidentiality.'),
  ('What documents do I need for the profiling form?', 'You need a valid government-issued ID (front and back). Accepted IDs include PhilHealth, Student ID, National ID, and others.')
ON CONFLICT DO NOTHING;

INSERT INTO announcements (title, content, type, status) VALUES
  ('Welcome to BarangayConnect!',
   'We are excited to launch the new BarangayConnect portal for Barangay Bakakeng Central. Stay connected with your community, access services, and stay informed through this platform.',
   'General', 'Upcoming')
ON CONFLICT DO NOTHING;

-- ── ROLE SETUP ───────────────────────────────────────────────
-- STEP 1: Sign up at the app with email: SkAdmin@372822023
-- STEP 2: Complete the profiling form
-- STEP 3: Run this query to promote to Super Admin:
--
--   UPDATE user_roles SET role = 'super_admin' WHERE email = 'SkAdmin@372822023';
--
-- To promote any user to admin:
--   UPDATE user_roles SET role = 'admin' WHERE email = 'user@email.com';
--
-- Role permissions:
--   resident    → /dashboard only
--   admin       → Projects (CRUD), Events (CRUD), all others READ-ONLY
--   super_admin → Full access to all modules

-- ── INDEXES FOR PERFORMANCE ──────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_user_id      ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id    ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email      ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status       ON projects(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date     ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id      ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created      ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created    ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
