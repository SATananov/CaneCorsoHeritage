-- Extend file rating policies to community document files.
-- Keeps the existing ownership, visibility and active-member rules intact.
-- This is a new migration; previously applied migrations are not modified.

DROP POLICY IF EXISTS "file_ratings_insert_own" ON public.file_ratings;

CREATE POLICY "file_ratings_insert_own"
ON public.file_ratings
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.user_files AS f
        WHERE f.id = file_ratings.file_id
          AND f.visibility = 'community'
          AND f.user_id <> auth.uid()
          AND (
              f.mime_type LIKE 'image/%'
              OR f.mime_type LIKE 'audio/%'
              OR f.mime_type LIKE 'video/%'
              OR f.mime_type IN (
                  'application/pdf',
                  'text/plain',
                  'text/csv',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.oasis.opendocument.text',
                  'application/vnd.ms-excel',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              )
          )
    )
);

DROP POLICY IF EXISTS "file_ratings_public_read" ON public.file_ratings;

CREATE POLICY "file_ratings_public_read"
ON public.file_ratings
FOR SELECT
TO authenticated, anon
USING (
    EXISTS (
        SELECT 1
        FROM public.user_files AS f
        WHERE f.id = file_ratings.file_id
          AND f.visibility = 'community'
          AND (
              f.mime_type LIKE 'image/%'
              OR f.mime_type LIKE 'audio/%'
              OR f.mime_type LIKE 'video/%'
              OR f.mime_type IN (
                  'application/pdf',
                  'text/plain',
                  'text/csv',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.oasis.opendocument.text',
                  'application/vnd.ms-excel',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              )
          )
    )
);

DROP POLICY IF EXISTS "file_ratings_update_own" ON public.file_ratings;

CREATE POLICY "file_ratings_update_own"
ON public.file_ratings
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.user_files AS f
        WHERE f.id = file_ratings.file_id
          AND f.visibility = 'community'
          AND f.user_id <> auth.uid()
          AND (
              f.mime_type LIKE 'image/%'
              OR f.mime_type LIKE 'audio/%'
              OR f.mime_type LIKE 'video/%'
              OR f.mime_type IN (
                  'application/pdf',
                  'text/plain',
                  'text/csv',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.oasis.opendocument.text',
                  'application/vnd.ms-excel',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              )
          )
    )
)
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.user_files AS f
        WHERE f.id = file_ratings.file_id
          AND f.visibility = 'community'
          AND f.user_id <> auth.uid()
          AND (
              f.mime_type LIKE 'image/%'
              OR f.mime_type LIKE 'audio/%'
              OR f.mime_type LIKE 'video/%'
              OR f.mime_type IN (
                  'application/pdf',
                  'text/plain',
                  'text/csv',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.oasis.opendocument.text',
                  'application/vnd.ms-excel',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              )
          )
    )
);
