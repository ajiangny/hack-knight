-- HackKnight Admin — Supabase Schema

-- Schedule Events

CREATE TABLE schedule_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day TEXT NOT NULL CHECK (day IN ('fri', 'sat', 'sun')),
  start_hour NUMERIC NOT NULL,
  end_hour NUMERIC NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'violet',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read schedule_events" ON schedule_events FOR SELECT USING (true);
CREATE POLICY "Service role full access schedule_events" ON schedule_events FOR ALL USING (auth.role() = 'service_role');

-- Schedule Day Headers

CREATE TABLE schedule_days (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

ALTER TABLE schedule_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read schedule_days" ON schedule_days FOR SELECT USING (true);
CREATE POLICY "Service role full access schedule_days" ON schedule_days FOR ALL USING (auth.role() = 'service_role');

-- Seed day headers
INSERT INTO schedule_days (key, label, sort_order) VALUES
  ('fri', 'Fri Oct 9', 0),
  ('sat', 'Sat Oct 10', 1),
  ('sun', 'Sun Oct 11', 2);

-- Gallery Years

CREATE TABLE gallery_years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0
);

ALTER TABLE gallery_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read gallery_years" ON gallery_years FOR SELECT USING (true);
CREATE POLICY "Service role full access gallery_years" ON gallery_years FOR ALL USING (auth.role() = 'service_role');

-- Gallery Photos

CREATE TABLE gallery_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_id UUID REFERENCES gallery_years(id) ON DELETE CASCADE,
  src TEXT NOT NULL,
  alt TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read gallery_photos" ON gallery_photos FOR SELECT USING (true);
CREATE POLICY "Service role full access gallery_photos" ON gallery_photos FOR ALL USING (auth.role() = 'service_role');

-- Companies (reusable logo badges for team members; also doubles as the
-- sponsor list — a company becomes a public sponsor once sponsor_tier is set)

CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  sponsor_tier TEXT CHECK (sponsor_tier IN ('platinum', 'gold', 'silver', 'bronze')),
  sponsor_url TEXT,
  sponsor_blurb TEXT
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Service role full access companies" ON companies FOR ALL USING (auth.role() = 'service_role');

-- Site Settings (Misc admin tab — singleton key/value store)

CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read site_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Service role full access site_settings" ON site_settings FOR ALL USING (auth.role() = 'service_role');

INSERT INTO site_settings (key, value) VALUES
  ('countdown_target', '2026-10-09T00:00:00'),
  ('mlh_badge_enabled', 'false');

-- 'registration_open' is intentionally absent: PUT /api/settings/:key upserts,
-- so the row appears the first time an admin saves the Misc tab toggle, and
-- readers treat a missing key as closed.

-- Registrations (participant sign-ups)

CREATE TABLE registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  age INT NOT NULL CHECK (age BETWEEN 13 AND 100),
  school TEXT NOT NULL,
  level_of_study TEXT NOT NULL,
  country TEXT NOT NULL,
  -- MLH member-event checkboxes: the first two must be true (the API rejects
  -- otherwise); mlh_emails is the optional opt-in.
  mlh_code_of_conduct BOOLEAN NOT NULL,
  mlh_data_sharing BOOLEAN NOT NULL,
  mlh_emails BOOLEAN NOT NULL DEFAULT false,
  -- In-bucket path in the private 'resumes' storage bucket. Nullable only
  -- because rows predating the resume requirement have no file.
  resume_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Case-insensitive uniqueness so Alice@x.com and alice@x.com collide.
CREATE UNIQUE INDEX registrations_email_unique ON registrations (lower(email));
CREATE INDEX registrations_created_at_idx ON registrations (created_at DESC);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
-- Deliberately NO public read policy: this table holds participant PII and is
-- reachable only through the service role, behind admin auth in the API.
CREATE POLICY "Service role full access registrations" ON registrations FOR ALL USING (auth.role() = 'service_role');
REVOKE ALL ON TABLE registrations FROM anon, authenticated;
GRANT ALL ON TABLE registrations TO service_role;

-- See supabase/migrations/20260807221653_registrations.sql for the
-- registrations table, its policy, and its grants, and
-- supabase/migrations/20260809120000_mlh_registration_fields.sql for the MLH
-- fields (phone, age, level_of_study, country, mlh_* checkboxes) and the
-- cuny_school → school rename, and
-- supabase/migrations/20260809130000_drop_registration_major.sql for the
-- removal of major, and
-- supabase/migrations/20260809150000_registration_resumes.sql for the private
-- 'resumes' storage bucket (4 MB / PDF-DOC-DOCX limits) and resume_path.

-- Team Members

CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  badge_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  company1_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  company2_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Migration (run against existing DB):
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS github_url TEXT;
-- See supabase/migrations/20260711000000_companies_and_member_badges.sql for
-- the companies table + company1_id/company2_id columns, and
-- supabase/migrations/20260711000001_sponsors_and_site_settings.sql for the
-- companies sponsor_* columns + site_settings table.

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read team_members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Service role full access team_members" ON team_members FOR ALL USING (auth.role() = 'service_role');

-- Seed Schedule Events

INSERT INTO schedule_events (day, start_hour, end_hour, label, color, sort_order) VALUES
  ('fri', 10, 11, 'Check-in begins', 'cyan', 0),
  ('fri', 11, 12, 'Opening Ceremony begins', 'violet', 1),
  ('fri', 12, 13, 'Hacking Begins', 'green', 2),
  ('fri', 13, 14, 'Lunch', 'orange', 3),
  ('fri', 19, 20, 'Dinner', 'orange', 4),
  ('fri', 23, 24, 'Midnight Ramen', 'orange', 5),
  ('sat', 9, 10, 'Breakfast', 'orange', 6),
  ('sat', 13, 14, 'Lunch', 'orange', 7),
  ('sat', 18, 19, 'Dinner', 'orange', 8),
  ('sat', 23, 24, 'Midnight Ramen', 'orange', 9),
  ('sun', 9, 10, 'Check-in starts', 'cyan', 10),
  ('sun', 12, 13, 'Submission Deadline', 'green', 11),
  ('sun', 12, 13, 'Lunch', 'orange', 12),
  ('sun', 12.5, 16.5, 'Judging', 'violet', 13),
  ('sun', 16, 17, 'Closing Ceremony', 'violet', 14);
