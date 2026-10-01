-- Dummy data for local development. `npx supabase db reset` only loads
-- supabase/seed.sql (see [db.seed] in config.toml), so copy this file there
-- first: cp supabase/seeds/dummy.sql supabase/seed.sql
--
-- Everything here is FAKE and safe to commit. Never put real registrant data
-- or a production dump in this folder; keep those in the gitignored
-- supabase/seed.sql or supabase/prod_data.sql instead.
--
-- Image URLs point at the local `photos` bucket under seed/. SQL cannot upload
-- the files themselves, so after a reset run:
--   cd backend && npx tsx scripts/seed-storage.ts
-- The host must stay 127.0.0.1:54321 (matching VITE_SUPABASE_URL) so the
-- frontend's /photos/ rewrite in useApiData.ts picks the URLs up.
--
-- Rows referenced by foreign keys use fixed UUIDs so the file reads top-down.

-- ── Site settings ────────────────────────────────────────────────────────────
insert into public.site_settings (key, value) values
  ('countdown_target',         '2026-10-09T09:00:00'),
  ('registration_open',        'true'),
  ('registration_closed_mode', 'coming_soon'),
  ('judges_revealed',          'true'),
  ('mlh_badge_enabled',        'true'),
  ('mlh_disclaimer_enabled',   'true'),
  ('sponsors_tba_enabled',     'true'),
  ('location_name',            'Queens College - CUNY');

-- ── Companies (logo badges shown on team members and judges) ─────────────────
insert into public.companies (id, name, logo_url, sort_order) values
  ('00000000-0000-4000-a000-000000000001', 'Company A', 'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/logo.png', 1),
  ('00000000-0000-4000-a000-000000000002', 'Company B', 'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/logo.png', 2),
  ('00000000-0000-4000-a000-000000000003', 'Company C', 'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/logo.png', 3),
  ('00000000-0000-4000-a000-000000000004', 'Company D', 'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/logo.png', 4);

-- ── Team members ─────────────────────────────────────────────────────────────
insert into public.team_members
  (name, title, photo_url, badge_url, linkedin_url, github_url, company1_id, company2_id, sort_order)
values
  ('Team Member 1', 'Lead Organizer',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/member.png',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/badge.png',
   'https://www.linkedin.com/', 'https://github.com/',
   '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', 1),
  ('Team Member 2', 'Operations',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/member.png',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/badge.png',
   'https://www.linkedin.com/', 'https://github.com/',
   '00000000-0000-4000-a000-000000000003', null, 2),
  ('Team Member 3', 'Marketing',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/member.png',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/badge.png',
   'https://www.linkedin.com/', null,
   null, null, 3),
  ('Team Member 4', 'Sponsorships',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/member.png',
   null,
   'https://www.linkedin.com/', 'https://github.com/',
   '00000000-0000-4000-a000-000000000004', null, 4),
  ('Team Member 5', 'Design',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/member.png',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/badge.png',
   null, 'https://github.com/',
   null, null, 5),
  ('Team Member 6', 'Web Development',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/member.png',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/badge.png',
   'https://www.linkedin.com/', 'https://github.com/',
   '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 6);

-- ── Judges ───────────────────────────────────────────────────────────────────
insert into public.judges (name, title, photo_url, company1_id, company2_id, sort_order) values
  ('Judge 1', 'Software Engineer',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/member.png',
   '00000000-0000-4000-a000-000000000001', null, 1),
  ('Judge 2', 'Product Manager',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/member.png',
   '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003', 2),
  ('Judge 3', 'Professor of Computer Science',
   'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/member.png',
   null, null, 3);

-- ── Sponsors (6+ switches the homepage to the scrolling carousel) ────────────
insert into public.sponsors (name, logo_url, tier, url, blurb, sort_order) values
  ('Platinum Sponsor', 'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/logo.png',
   'platinum', 'https://example.com/', '**Platinum Sponsor** builds things. This blurb supports *Markdown*.', 1),
  ('Gold Sponsor 1', 'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/logo.png',
   'gold', 'https://example.com/', 'A short description of **Gold Sponsor 1**.', 2),
  ('Gold Sponsor 2', 'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/logo.png',
   'gold', 'https://example.com/', 'A short description of **Gold Sponsor 2**.', 3),
  ('Silver Sponsor 1', 'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/logo.png',
   'silver', 'https://example.com/', 'A short description of Silver Sponsor 1.', 4),
  ('Silver Sponsor 2', 'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/logo.png',
   'silver', null, null, 5),
  ('Bronze Sponsor 1', 'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/logo.png',
   'bronze', 'https://example.com/', null, 6),
  ('Bronze Sponsor 2', 'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/logo.png',
   'bronze', null, null, 7);

-- ── Gallery ──────────────────────────────────────────────────────────────────
insert into public.gallery_years (id, year, sort_order) values
  ('00000000-0000-4000-b000-000000002024', '2024', 2),
  ('00000000-0000-4000-b000-000000002025', '2025', 1);

insert into public.gallery_photos (year_id, src, alt, sort_order)
select y.id,
       'http://127.0.0.1:54321/storage/v1/object/public/photos/seed/gallery/' || y.year || '/' || n || '.webp',
       'Hack Knight ' || y.year || ' photo ' || n,
       n
from public.gallery_years y
cross join generate_series(1, 6) as n;

-- ── Schedule ─────────────────────────────────────────────────────────────────
insert into public.schedule_days (key, label, sort_order) values
  ('fri', 'Fri Oct 9',  1),
  ('sat', 'Sat Oct 10', 2),
  ('sun', 'Sun Oct 11', 3);

insert into public.schedule_event_types (id, label, color, sort_order) values
  ('00000000-0000-4000-c000-000000000001', 'Ceremony', 'violet', 0),
  ('00000000-0000-4000-c000-000000000002', 'Check-in', 'cyan',   1),
  ('00000000-0000-4000-c000-000000000003', 'Hacking',  'green',  2),
  ('00000000-0000-4000-c000-000000000004', 'Food',     'orange', 3),
  ('00000000-0000-4000-c000-000000000005', 'Workshop', 'pink',   4),
  ('00000000-0000-4000-c000-000000000006', 'Fun',      'lime',   5);

-- `color` mirrors the type's color; the API prefers the type's color anyway.
insert into public.schedule_events (day, start_hour, end_hour, label, color, type_id, sort_order)
select e.day, e.start_hour, e.end_hour, e.label, t.color, t.id, e.sort_order
from (values
  ('fri', 10,   11,   'Check-in Begins',        'Check-in', 1),
  ('fri', 11,   12,   'Opening Ceremony',       'Ceremony', 2),
  ('fri', 12,   13,   'Hacking Begins',         'Hacking',  3),
  ('fri', 13,   14,   'Lunch',                  'Food',     4),
  ('fri', 15,   16,   'Intro to Git Workshop',  'Workshop', 5),
  ('fri', 19,   20,   'Dinner',                 'Food',     6),
  ('fri', 23,   24,   'Midnight Ramen',         'Food',     7),
  ('sat', 9,    10,   'Breakfast',              'Food',     1),
  ('sat', 11,   12,   'Build an API Workshop',  'Workshop', 2),
  ('sat', 13,   14,   'Lunch',                  'Food',     3),
  ('sat', 16,   17,   'Cup Stacking',           'Fun',      4),
  ('sat', 18,   19,   'Dinner',                 'Food',     5),
  ('sun', 9,    10,   'Breakfast',              'Food',     1),
  ('sun', 12,   13,   'Submission Deadline',    'Hacking',  2),
  ('sun', 12.5, 16.5, 'Judging',                'Ceremony', 3),
  ('sun', 16.5, 17.5, 'Closing Ceremony',       'Ceremony', 4)
) as e(day, start_hour, end_hour, label, type_label, sort_order)
join public.schedule_event_types t on t.label = e.type_label;

-- ── Registrations (admin dashboard only; all fake, @example.com) ────────────
-- Values come from backend/src/lib/registrationOptions.ts so they match what
-- the public form would accept.
insert into public.registrations
  (first_name, last_name, email, school, phone, age, level_of_study, country,
   mlh_code_of_conduct, mlh_data_sharing, mlh_emails, gender, pronouns,
   race_ethnicity, sexual_orientation, major, dietary_restrictions, linkedin_url)
values
  ('Test', 'Hacker One', 'hacker1@example.com', 'The City University of New York Queens College',
   '555-555-0101', 20, 'Undergraduate University (3+ year)', 'United States of America',
   true, true, true, 'Woman', 'She/Her',
   array['Chinese'], 'Prefer Not to Answer',
   'Computer science, computer engineering, or software engineering', array['Vegetarian'], 'https://www.linkedin.com/'),
  ('Test', 'Hacker Two', 'hacker2@example.com', 'The City University of New York Queens College',
   '555-555-0102', 19, 'Undergraduate University (2 year - community college or similar)', 'United States of America',
   true, true, false, 'Man', 'He/Him',
   array['Hispanic / Latino / Spanish Origin'], 'Heterosexual or straight',
   'Information systems, information technology, or system administration', '{}', null),
  ('Test', 'Hacker Three', 'hacker3@example.com', 'The City University of New York Queens College',
   '555-555-0103', 22, 'Undergraduate University (3+ year)', 'United States of America',
   true, true, false, 'Non-Binary', 'They/Them',
   array['Korean', 'Black or African'], 'Bisexual',
   'Mathematics or statistics', array['Halal'], null),
  ('Test', 'Hacker Four', 'hacker4@example.com', 'The City University of New York Queens College',
   '555-555-0104', 24, 'Graduate University (Masters, Professional, Doctoral, etc)', 'Canada',
   true, true, true, 'Prefer Not to Answer', null,
   array['Asian Indian'], 'Prefer Not to Answer',
   'Web development or web design', array['Vegan', 'Allergies'], 'https://www.linkedin.com/'),
  ('Test', 'Hacker Five', 'hacker5@example.com', 'The City University of New York Queens College',
   '555-555-0105', 18, 'Secondary / High School', 'United States of America',
   true, true, false, 'Woman', 'She/They',
   array['Filipino'], 'Gay or lesbian',
   'A natural science (such as biology, chemistry, physics, etc.)', '{}', null);
