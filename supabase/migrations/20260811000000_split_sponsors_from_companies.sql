-- Sponsors move out of the companies table into their own table. Companies
-- go back to being badge-only (team section), so the two kinds of logos are
-- managed and displayed independently.

CREATE TABLE sponsors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('platinum', 'gold', 'silver', 'bronze')),
  url TEXT,
  blurb TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sponsors" ON sponsors FOR SELECT USING (true);
CREATE POLICY "Service role full access sponsors" ON sponsors FOR ALL USING (auth.role() = 'service_role');

-- Carry the existing sponsors over, then strip the sponsor columns so a
-- company row is a badge and nothing more. Copied rows keep pointing at the
-- same logo files under companies/ in storage; the sponsors API only deletes
-- files under sponsors/, so removing a migrated sponsor can't break a team
-- badge that shares its logo.
INSERT INTO sponsors (name, logo_url, tier, url, blurb, sort_order)
SELECT name, logo_url, sponsor_tier, sponsor_url, sponsor_blurb, sort_order
FROM companies
WHERE sponsor_tier IS NOT NULL;

ALTER TABLE companies
  DROP COLUMN IF EXISTS sponsor_tier,
  DROP COLUMN IF EXISTS sponsor_url,
  DROP COLUMN IF EXISTS sponsor_blurb;
