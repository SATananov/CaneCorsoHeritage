DROP POLICY IF EXISTS "admins can update all user files" ON public.user_files;
DROP POLICY IF EXISTS "user_files_storage_update_own" ON storage.objects;
DROP POLICY IF EXISTS "active members can update user storage" ON storage.objects;

CREATE OR REPLACE FUNCTION public.admin_moderate_file(
    target_file_id uuid,
    target_moderation_status text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    affected_rows bigint;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required';
    END IF;

    IF target_moderation_status NOT IN ('approved', 'rejected', 'hidden') THEN
        RAISE EXCEPTION 'Unsupported file moderation status';
    END IF;

    UPDATE public.user_files
    SET
        moderation_status = target_moderation_status,
        moderated_at = now(),
        moderated_by = auth.uid(),
        updated_at = now()
    WHERE id = target_file_id
      AND visibility = 'community';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'File moderation did not affect exactly one Community file';
    END IF;

    RETURN affected_rows;
END;
$$;

ALTER FUNCTION public.admin_moderate_file(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_moderate_file(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_moderate_file(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_file(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.owner_update_user_file_metadata(
    target_file_id uuid,
    target_file_name text,
    target_allow_member_download boolean
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    affected_rows bigint;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT (public.is_active_member() OR public.is_admin()) THEN
        RAISE EXCEPTION 'Active member access required';
    END IF;

    IF length(trim(coalesce(target_file_name, ''))) = 0 THEN
        RAISE EXCEPTION 'File name is required';
    END IF;

    UPDATE public.user_files
    SET
        file_name = trim(target_file_name),
        allow_member_download = coalesce(target_allow_member_download, false),
        updated_at = now()
    WHERE id = target_file_id
      AND user_id = auth.uid();

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'Owner file metadata update did not affect exactly one row';
    END IF;

    RETURN affected_rows;
END;
$$;

ALTER FUNCTION public.owner_update_user_file_metadata(uuid, text, boolean) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.owner_update_user_file_metadata(uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_update_user_file_metadata(uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.owner_update_user_file_metadata(uuid, text, boolean) TO authenticated;
