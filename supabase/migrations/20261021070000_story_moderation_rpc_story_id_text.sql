-- Correct the Story moderation RPC parameter type.
--
-- stories.id is TEXT in the baseline schema. The previous moderation function
-- accepted UUID, which makes `stories.id = target_story_id` a text = uuid
-- comparison. Remove that overload and recreate the narrow moderation RPC with
-- a TEXT Story identifier while preserving the author-only CRUD boundary.

DROP FUNCTION IF EXISTS public.admin_moderate_story(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_moderate_story(
    target_story_id text,
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

ALTER FUNCTION public.admin_moderate_story(text, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.admin_moderate_story(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_moderate_story(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_story(text, text) TO authenticated;
