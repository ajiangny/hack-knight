-- Resume uploads for registrations. Resumes are PII, so unlike the photos
-- bucket this one is PRIVATE: no public read policy, and the browser never
-- gets a stable URL. Admins view files through short-lived signed URLs minted
-- by the Express API (service role) behind admin auth.

-- The bucket-level size limit and MIME allowlist are defense in depth; the
-- API validates both before anything reaches storage.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  4194304, -- 4 MB; Vercel caps request bodies at 4.5 MB anyway
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Deliberately NO public read policy (compare 20240628000001, where photos
-- get one). The service role bypasses RLS, so this policy is belt-and-braces
-- documentation of who may touch the bucket.
CREATE POLICY "Service role full access resumes" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'resumes')
  WITH CHECK (bucket_id = 'resumes');

-- In-bucket object path (not a URL — private buckets have none). Nullable
-- because rows that predate this migration have no file; the API requires a
-- resume on every new registration.
ALTER TABLE registrations ADD COLUMN resume_path TEXT;
