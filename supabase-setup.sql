-- ============================================================
--  BARANGAYCONNECT — SUPABASE SETUP SQL
--  Project: ithesyrynjhlhrzzpccv
--  Run this entire file in:
--  https://supabase.com/dashboard/project/ithesyrynjhlhrzzpccv/sql/new
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ────────────────────────────────────────────────────────────
-- 2. USER_ROLES
--    Stores role assignment for every registered user.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  name       TEXT,
  role       TEXT NOT NULL DEFAULT 'resident'
               CHECK (role IN ('resident','admin','super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role; admins can read all
CREATE POLICY "user_roles: own read" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_roles: admin read" ON public.user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    )
  );

-- Only super_admin can modify roles
CREATE POLICY "user_roles: super_admin write" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role = 'super_admin'
    )
  );

-- Allow new users to insert their own role row on signup
CREATE POLICY "user_roles: self insert" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own non-role fields (name, email)
CREATE POLICY "user_roles: self update" ON public.user_roles
  FOR UPDATE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 3. PROFILES
--    Resident profiling / KYC data.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    TEXT,
  last_name               TEXT,
  given_name              TEXT,
  middle_name             TEXT,
  email                   TEXT,
  address                 TEXT,
  contact_number          TEXT,
  birthday                DATE,
  age                     INT,
  gender                  TEXT,
  civil_status            TEXT,
  work_status             TEXT,
  youth_age_group         TEXT,
  youth_classification    TEXT,
  educational_background  TEXT,
  registered_sk_voter     BOOLEAN DEFAULT FALSE,
  voted_last_election     BOOLEAN DEFAULT FALSE,
  national_voter          BOOLEAN DEFAULT FALSE,
  id_front_url            TEXT,
  id_back_url             TEXT,
  id_submitted_at         TIMESTAMPTZ,
  verification_status     TEXT DEFAULT 'Pending'
                            CHECK (verification_status IN ('Pending','Verified','Rejected','Not Submitted')),
  profile_completed       BOOLEAN DEFAULT FALSE,
  avatar_url              TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: own read/write" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "profiles: admin read" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    )
  );

CREATE POLICY "profiles: admin update" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    )
  );


-- ────────────────────────────────────────────────────────────
-- 4. PROJECTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_name     TEXT NOT NULL,
  description      TEXT,
  status           TEXT DEFAULT 'upcoming'
                     CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
  budget           NUMERIC(15,2),
  fund_source      TEXT DEFAULT 'SK ABYIP',
  start_date       DATE,
  end_date         DATE,
  images           TEXT[] DEFAULT '{}',
  prepared_by      TEXT,
  previous_status  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "projects: public read" ON public.projects
  FOR SELECT USING (TRUE);

-- Only admin/super_admin can write
CREATE POLICY "projects: admin write" ON public.projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    )
  );


-- ────────────────────────────────────────────────────────────
-- 5. EVENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title          TEXT NOT NULL,
  description    TEXT,
  location       TEXT,
  handler        TEXT,
  external_link  TEXT,
  start_date     TIMESTAMPTZ,
  end_date       TIMESTAMPTZ,
  status         TEXT DEFAULT 'upcoming'
                   CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
  cancel_reason  TEXT,
  event_id       TEXT,
  session_id     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events: public read" ON public.events
  FOR SELECT USING (TRUE);

CREATE POLICY "events: admin write" ON public.events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    )
  );


-- ────────────────────────────────────────────────────────────
-- 6. ANNOUNCEMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  content    TEXT,
  location   TEXT,
  date_time  TIMESTAMPTZ,
  type       TEXT DEFAULT 'general',
  status     TEXT DEFAULT 'active'
               CHECK (status IN ('active','archived','draft')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements: public read" ON public.announcements
  FOR SELECT USING (TRUE);

CREATE POLICY "announcements: admin write" ON public.announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    )
  );


-- ────────────────────────────────────────────────────────────
-- 7. FEEDBACK
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resident_name TEXT,
  subject       TEXT,
  rating        TEXT CHECK (rating IN ('good','average','bad')),
  message       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Residents can insert their own feedback
CREATE POLICY "feedback: authenticated insert" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can read all feedback
CREATE POLICY "feedback: admin read" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    )
  );

-- Users can read their own feedback
CREATE POLICY "feedback: own read" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 8. FAQS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faqs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question   TEXT NOT NULL,
  answer     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faqs: public read" ON public.faqs
  FOR SELECT USING (TRUE);

CREATE POLICY "faqs: admin write" ON public.faqs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    )
  );


-- ────────────────────────────────────────────────────────────
-- 9. AUDIT_LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name   TEXT,
  user_role   TEXT,
  action      TEXT,
  module      TEXT,
  description TEXT,
  status      TEXT DEFAULT 'Success',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can insert audit logs
CREATE POLICY "audit_logs: authenticated insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only admin/super_admin can read logs
CREATE POLICY "audit_logs: admin read" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    )
  );


-- ────────────────────────────────────────────────────────────
-- 10. STORAGE BUCKETS
--     Run each block separately if any bucket already exists.
-- ────────────────────────────────────────────────────────────

-- profile-pictures  (public — avatars shown on UI)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', TRUE)
ON CONFLICT (id) DO NOTHING;

-- project-images  (public — shown on project cards)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- verification-ids  (PRIVATE — admin signed-URL access only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-ids', 'verification-ids', FALSE)
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 11. STORAGE POLICIES
-- ────────────────────────────────────────────────────────────

-- profile-pictures: any authenticated user can upload their own
CREATE POLICY "profile-pictures: auth upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-pictures' AND auth.role() = 'authenticated'
  );

CREATE POLICY "profile-pictures: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-pictures');

CREATE POLICY "profile-pictures: owner update/delete" ON storage.objects
  FOR ALL USING (
    bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- project-images: admin only upload, public read
CREATE POLICY "project-images: admin upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-images' AND
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    )
  );

CREATE POLICY "project-images: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-images');

-- verification-ids: authenticated user upload, admin signed-URL read
CREATE POLICY "verification-ids: auth upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-ids' AND auth.role() = 'authenticated'
  );

CREATE POLICY "verification-ids: admin read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verification-ids' AND
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role IN ('admin','super_admin')
    )
  );


-- ────────────────────────────────────────────────────────────
-- 12. INDEXES  (improves query performance)
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id    ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id      ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_vstatus      ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_projects_status       ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date     ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_announcements_status  ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id      ON public.feedback(user_id);


-- ────────────────────────────────────────────────────────────
-- 13. SEED: FIRST SUPER ADMIN
--     After running this file, register your super-admin
--     account normally via the app's login page, then run
--     the UPDATE below (replace the email with your own).
-- ────────────────────────────────────────────────────────────

-- STEP: After registering your account, run this to promote yourself:
-- UPDATE public.user_roles
-- SET role = 'super_admin'
-- WHERE email = 'your-admin-email@example.com';


-- ────────────────────────────────────────────────────────────
-- DONE ✓
-- Tables:   user_roles, profiles, projects, events,
--           announcements, feedback, faqs, audit_logs
-- Buckets:  profile-pictures, project-images, verification-ids
-- ────────────────────────────────────────────────────────────
