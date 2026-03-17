-- ============================================================
-- BarangayConnect – FIX SCRIPT
-- Run this if you already ran the setup before and got errors.
-- This ONLY adds missing columns to existing tables safely.
-- ============================================================

-- ── PROFILES: add all missing columns ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS given_name             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS middle_name            TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name              TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_front_url           TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_back_url            TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_submitted_at        TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS decline_reason         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS youth_spec             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed      BOOLEAN DEFAULT FALSE;

-- ── PROJECTS: add images column ──
ALTER TABLE projects ADD COLUMN IF NOT EXISTS images                 TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completion_date        TIMESTAMPTZ;

-- ── FIX INDEXES: only create if columns actually exist now ──
DO $$
BEGIN
  -- feedback.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id)';
  END IF;

  -- audit_logs.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)';
  END IF;

  -- events.start_date
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'start_date'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date)';
  END IF;

  -- feedback.created_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC)';
  END IF;

  -- audit_logs.created_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)';
  END IF;
END $$;

-- ── SAFE INDEXES (columns guaranteed to exist) ──
CREATE INDEX IF NOT EXISTS idx_profiles_user_id      ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id    ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email      ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status       ON projects(status);

-- ── RLS POLICIES (safe re-run) ──
ALTER TABLE user_roles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback      ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "allow_all_user_roles"    ON user_roles    FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_profiles"      ON profiles      FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_announcements" ON announcements FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_projects"      ON projects      FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_events"        ON events        FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_feedback"      ON feedback      FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_faqs"          ON faqs          FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_audit_logs"    ON audit_logs    FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── STORAGE POLICIES (safe re-run) ──
DO $$ BEGIN CREATE POLICY "allow_all_verification_ids" ON storage.objects FOR ALL USING (bucket_id = 'verification-ids') WITH CHECK (bucket_id = 'verification-ids'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_project_images"   ON storage.objects FOR ALL USING (bucket_id = 'project-images')   WITH CHECK (bucket_id = 'project-images');   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "allow_all_profile_pictures" ON storage.objects FOR ALL USING (bucket_id = 'profile-pictures') WITH CHECK (bucket_id = 'profile-pictures'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── SAMPLE FAQS (only if table is empty) ──
INSERT INTO faqs (question, answer)
SELECT * FROM (VALUES
  ('What are the barangay office hours?',              'The barangay office is open Monday to Friday, 8:00 AM to 5:00 PM.'),
  ('How do I get a barangay clearance?',               'Visit the barangay hall with a valid ID. The clearance fee is ₱50. Processing takes 1–2 working days.'),
  ('When is the next SK event?',                       'Check the Events section on the BarangayConnect dashboard for upcoming SK events.'),
  ('How do I register as an SK voter?',                'Visit the COMELEC office or barangay hall during voter registration with a valid government-issued ID.'),
  ('How do I submit a complaint or report?',           'Use the Report button on the dashboard or visit the barangay hall. All reports are treated with confidentiality.'),
  ('What documents do I need for the profiling form?', 'You need a valid government-issued ID (front and back). Accepted: PhilHealth, Student ID, National ID.')
) AS new_data(question, answer)
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

-- ── SAMPLE ANNOUNCEMENT (only if table is empty) ──
INSERT INTO announcements (title, content, type, status)
SELECT 'Welcome to BarangayConnect!',
       'We are excited to launch the new BarangayConnect portal for Barangay Bakakeng Central. Stay connected, access services, and stay informed.',
       'General', 'Upcoming'
WHERE NOT EXISTS (SELECT 1 FROM announcements LIMIT 1);

-- ── VERIFY: show all tables and their column counts ──
SELECT table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('user_roles','profiles','announcements','projects','events','feedback','faqs','audit_logs')
GROUP BY table_name
ORDER BY table_name;
