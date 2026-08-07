-- Hackathon registrations. Unlike every other table in this schema, this one
-- holds participant PII, so it gets no public read policy — the only way in is
-- the service role via the Express API, which gates reads behind admin auth.

CREATE TABLE registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  major TEXT NOT NULL,
  cuny_school TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Case-insensitive uniqueness so Alice@x.com and alice@x.com collide.
CREATE UNIQUE INDEX registrations_email_unique
  ON registrations (lower(email));

CREATE INDEX registrations_created_at_idx ON registrations (created_at DESC);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Deliberately NO public read policy. Every other table in this schema has
-- one; this table must not.
CREATE POLICY "Service role full access registrations"
  ON registrations FOR ALL USING (auth.role() = 'service_role');

-- The initial migration set ALTER DEFAULT PRIVILEGES granting new public
-- tables to anon and authenticated. RLS would still block them, but a table
-- of student PII should not be reachable by the browser-facing roles at all.
REVOKE ALL ON TABLE registrations FROM anon, authenticated;
GRANT ALL ON TABLE registrations TO service_role;

-- No site_settings seed row for registration_open on purpose. site_settings is
-- unseeded by migration (see 20260711000001) because supabase/seed.sql carries
-- a production data dump, and seeding the same key in both places makes
-- `db reset` fail on a duplicate key. PUT /api/settings/:key upserts instead,
-- and the registration route treats a missing key as closed.
