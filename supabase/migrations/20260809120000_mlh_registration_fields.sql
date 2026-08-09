-- MLH member-event registration requirements: phone, age, level of study,
-- country of residence, and the three MLH agreement checkboxes.
-- https://guide.mlh.com/general-information/managing-registrations/registrations
--
-- The event is also open to all college students now, not only CUNY, so
-- cuny_school becomes school: the form still offers the CUNY dropdown but adds
-- an "Other" free-text path, and the API no longer validates against the CUNY
-- allowlist.

ALTER TABLE registrations RENAME COLUMN cuny_school TO school;

-- Added NOT NULL with placeholder defaults so the ALTER succeeds if any
-- pre-launch test rows exist; the defaults are dropped right after because the
-- API always supplies real values. Only mlh_emails keeps its default — it is
-- the one genuinely optional field (the opt-in checkbox).
ALTER TABLE registrations
  ADD COLUMN phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN age INT NOT NULL DEFAULT 18 CHECK (age BETWEEN 13 AND 100),
  ADD COLUMN level_of_study TEXT NOT NULL DEFAULT '',
  ADD COLUMN country TEXT NOT NULL DEFAULT '',
  ADD COLUMN mlh_code_of_conduct BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN mlh_data_sharing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN mlh_emails BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE registrations
  ALTER COLUMN phone DROP DEFAULT,
  ALTER COLUMN age DROP DEFAULT,
  ALTER COLUMN level_of_study DROP DEFAULT,
  ALTER COLUMN country DROP DEFAULT,
  ALTER COLUMN mlh_code_of_conduct DROP DEFAULT,
  ALTER COLUMN mlh_data_sharing DROP DEFAULT;
