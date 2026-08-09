-- Final participant registration fields: MLH-style demographics (gender,
-- pronouns, race/ethnicity, sexual orientation), major/field of study,
-- dietary restrictions for catering, and a LinkedIn URL for post-event
-- partner connections.
--
-- major returns after 20260809130000 dropped it — the team settled on
-- collecting it using MLH's field-of-study option list instead of free text.
--
-- Where the form offers a "self-describe"/"other" option, the API stores the
-- participant's typed text in place of the placeholder option, so a single
-- column per question suffices.
--
-- Same pattern as 20260809120000: NOT NULL columns are added with placeholder
-- defaults so the ALTER succeeds on existing rows, then the defaults are
-- dropped because the API always supplies real values. dietary_restrictions
-- keeps its default — an empty list is a legitimate answer — and pronouns and
-- linkedin_url stay nullable because both are genuinely optional.

ALTER TABLE registrations
  ADD COLUMN gender TEXT NOT NULL DEFAULT '',
  ADD COLUMN pronouns TEXT,
  ADD COLUMN race_ethnicity TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN sexual_orientation TEXT NOT NULL DEFAULT '',
  ADD COLUMN major TEXT NOT NULL DEFAULT '',
  ADD COLUMN dietary_restrictions TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN linkedin_url TEXT;

ALTER TABLE registrations
  ALTER COLUMN gender DROP DEFAULT,
  ALTER COLUMN race_ethnicity DROP DEFAULT,
  ALTER COLUMN sexual_orientation DROP DEFAULT,
  ALTER COLUMN major DROP DEFAULT;
