-- Judges shown on the public homepage. Mirrors team_members minus the
-- character badge and social links; company badges reuse the shared
-- companies table (max 2, same as team members).
CREATE TABLE judges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  company1_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  company2_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read judges" ON judges FOR SELECT USING (true);
CREATE POLICY "Service role full access judges" ON judges FOR ALL USING (auth.role() = 'service_role');

-- The judges_revealed site_settings key is deliberately not seeded here —
-- settings rows come from the production dump, and callers treat a missing
-- key as "off" (see backend/src/routes/settings.ts).
