-- Story authoring vs administrator moderation boundary.
--
-- Normal Story UPDATE/DELETE remains owner-only through stories_update_own
-- and stories_delete_own. Administrators moderate Community Stories through
-- the narrowly-scoped SECURITY DEFINER function below instead of receiving
-- unrestricted UPDATE/DELETE access to Story rows.

DROP POLICY IF EXISTS "admins can delete all stories" ON public.stories;
DROP POLICY IF EXISTS "admins can update all stories" ON public.stories;

CREATE OR REPLACE FUNCTION public.admin_moderate_story(
    target_story_id uuid,
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
        RAISE EXCEPTION 'Unsupported Story moderation status';
    END IF;

    UPDATE public.stories
    SET
        moderation_status = target_moderation_status,
        moderated_at = now(),
        moderated_by = auth.uid(),
        updated_at = now()
    WHERE id = target_story_id
      AND visibility = 'community';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'Story moderation did not affect exactly one Community Story';
    END IF;

    RETURN affected_rows;
END;
$$;

ALTER FUNCTION public.admin_moderate_story(uuid, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.admin_moderate_story(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_moderate_story(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_story(uuid, text) TO authenticated;
