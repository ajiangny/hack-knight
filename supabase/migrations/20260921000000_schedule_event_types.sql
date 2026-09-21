-- Admin-managed schedule event types. A type is a label plus one color from
-- the curated palette (mirrored in backend/src/lib/scheduleColors.ts and
-- frontend/src/lib/scheduleColors.ts); events point at a type, so recoloring
-- a type recolors every event that uses it.
CREATE TABLE IF NOT EXISTS schedule_event_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('violet', 'cyan', 'green', 'orange', 'pink', 'lime', 'tangerine')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE schedule_event_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read schedule_event_types" ON schedule_event_types;
CREATE POLICY "Public read schedule_event_types" ON schedule_event_types FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access schedule_event_types" ON schedule_event_types;
CREATE POLICY "Service role full access schedule_event_types" ON schedule_event_types FOR ALL USING (auth.role() = 'service_role');

-- RESTRICT: a type that events still use cannot be deleted (the API turns
-- this into a 409). schedule_events.color stays as the fallback for rows
-- without a type, e.g. events loaded from a seed dump taken before this
-- migration.
ALTER TABLE schedule_events
  ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES schedule_event_types(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS schedule_events_type_id_idx ON schedule_events (type_id);

-- Seed the default types only where there are existing events to backfill
-- (production, or a local `migration up`). On a `db reset` the table is
-- still empty here, so nothing is seeded and the types come from seed.sql
-- instead; seeding unconditionally would duplicate them once the dump
-- includes this table.
INSERT INTO schedule_event_types (label, color, sort_order)
SELECT v.label, v.color, v.sort_order
FROM (VALUES
  ('Ceremony', 'violet', 0),
  ('Check-in', 'cyan', 1),
  ('Hacking', 'green', 2),
  ('Food', 'orange', 3),
  ('Workshop', 'pink', 4),
  ('Fun', 'lime', 5)
) AS v(label, color, sort_order)
WHERE EXISTS (SELECT 1 FROM schedule_events)
  AND NOT EXISTS (SELECT 1 FROM schedule_event_types);

UPDATE schedule_events e
SET type_id = (
  SELECT t.id FROM schedule_event_types t
  WHERE t.color = e.color
  ORDER BY t.sort_order
  LIMIT 1
)
WHERE e.type_id IS NULL;
