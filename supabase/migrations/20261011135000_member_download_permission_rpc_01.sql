-- MEMBER DOWNLOAD PERMISSION RPC 01
-- Allows an owner to change only allow_member_download without reopening
-- moderation fields on an already approved Community file.

create or replace function public.set_user_file_download_permission(
    p_file_id uuid,
    p_allow_member_download boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    affected_rows integer;
begin
    if auth.uid() is null then
        return false;
    end if;

    if not (public.is_active_member() or public.is_admin()) then
        return false;
    end if;

    update public.user_files
    set
        allow_member_download = p_allow_member_download,
        updated_at = now()
    where id = p_file_id
      and (
          user_id = auth.uid()
          or public.is_admin()
      );

    get diagnostics affected_rows = row_count;

    return affected_rows = 1;
end;
$$;

revoke all on function public.set_user_file_download_permission(uuid, boolean) from public;
grant execute on function public.set_user_file_download_permission(uuid, boolean) to authenticated;