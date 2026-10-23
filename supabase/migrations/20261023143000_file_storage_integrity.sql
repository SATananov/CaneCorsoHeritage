-- Close the remaining user-files Storage replacement bypass without breaking
-- legitimate cleanup after metadata deletion, replacement, or failed uploads.

CREATE OR REPLACE FUNCTION public.user_file_storage_object_is_unreferenced(
    target_object_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
    SELECT NOT EXISTS (
        SELECT 1
        FROM public.user_files
        WHERE storage_path = target_object_name
    );
$$;

ALTER FUNCTION public.user_file_storage_object_is_unreferenced(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.user_file_storage_object_is_unreferenced(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_file_storage_object_is_unreferenced(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_file_storage_object_is_unreferenced(text) TO authenticated;

DROP POLICY IF EXISTS "user_files_storage_delete_own" ON storage.objects;

CREATE POLICY "user_files_storage_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'user-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.user_file_storage_object_is_unreferenced(name)
);

DROP POLICY IF EXISTS "admins can delete user file storage" ON storage.objects;

CREATE POLICY "admins can delete user file storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'user-files'
    AND public.is_admin()
    AND public.user_file_storage_object_is_unreferenced(name)
);

-- Restore the active-account UPDATE restriction specifically for avatars.
-- user-files UPDATE remains blocked because its permissive UPDATE policy was removed.
DROP POLICY IF EXISTS "active members can update user storage" ON storage.objects;
DROP POLICY IF EXISTS "active members can update avatar storage" ON storage.objects;

CREATE POLICY "active members can update avatar storage"
ON storage.objects
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
    bucket_id <> 'avatars'
    OR public.is_active_member()
    OR public.is_admin()
)
WITH CHECK (
    bucket_id <> 'avatars'
    OR public.is_active_member()
    OR public.is_admin()
);

-- Keep the legacy download-permission RPC for existing callers, but make it
-- owner-only. Admin moderation is intentionally separate.
CREATE OR REPLACE FUNCTION public.set_user_file_download_permission(
    p_file_id uuid,
    p_allow_member_download boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected_rows integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    IF NOT (public.is_active_member() OR public.is_admin()) THEN
        RETURN false;
    END IF;

    UPDATE public.user_files
    SET
        allow_member_download = p_allow_member_download,
        updated_at = now()
    WHERE id = p_file_id
      AND user_id = auth.uid();

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    RETURN affected_rows = 1;
END;
$$;

ALTER FUNCTION public.set_user_file_download_permission(uuid, boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_user_file_download_permission(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_file_download_permission(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_file_download_permission(uuid, boolean) TO authenticated;
