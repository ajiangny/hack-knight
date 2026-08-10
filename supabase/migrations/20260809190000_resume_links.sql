-- Resumes switch from uploaded files to Google Drive links: applicants share
-- a viewable link instead of attaching a file, so the CSV export handed to
-- MLH links straight to every resume. Required for new rows, enforced by the
-- API (nullable here, matching how the API owns validation elsewhere).
ALTER TABLE registrations ADD COLUMN resume_url TEXT;

-- The upload flow shipped and was replaced before any resume was stored, so
-- the column and its policy go away clean. The empty 'resumes' bucket
-- (20260809150000) cannot be dropped here: Supabase blocks direct SQL
-- writes to storage tables. Delete it once via the dashboard's Storage
-- section (or the Storage API); until then it is empty and unreferenced.
ALTER TABLE registrations DROP COLUMN resume_path;
DROP POLICY IF EXISTS "Service role full access resumes" ON storage.objects;
