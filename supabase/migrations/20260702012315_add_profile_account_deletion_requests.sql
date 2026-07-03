create table if not exists public.profile_account_deletion_request (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profile(id) on delete cascade,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  completed_at timestamptz null,
  admin_note text null,
  constraint profile_account_deletion_request_status_check
    check (status in ('pending', 'completed', 'canceled'))
);

create unique index if not exists profile_account_deletion_request_one_pending
  on public.profile_account_deletion_request(profile_id)
  where status = 'pending';

alter table public.profile_account_deletion_request enable row level security;

grant select on table public.profile_account_deletion_request to authenticated;

drop policy if exists "Profiles can read their account deletion requests"
  on public.profile_account_deletion_request;

create policy "Profiles can read their account deletion requests"
  on public.profile_account_deletion_request
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profile p
      where p.id = profile_account_deletion_request.profile_id
        and p.user_id = (select auth.uid())
    )
  );

create or replace function public.request_current_profile_account_deletion(
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_request public.profile_account_deletion_request%rowtype;
begin
  if p_profile_id is null then
    raise exception 'missing_required_arguments' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profile p
    where p.id = p_profile_id
      and p.user_id = auth.uid()
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select *
  into v_request
  from public.profile_account_deletion_request
  where profile_id = p_profile_id
    and status = 'pending'
  order by requested_at desc
  limit 1;

  if not found then
    insert into public.profile_account_deletion_request (
      profile_id,
      status
    )
    values (
      p_profile_id,
      'pending'
    )
    returning *
    into v_request;
  end if;

  return jsonb_build_object(
    'status', v_request.status,
    'requested_at', v_request.requested_at,
    'completed_at', v_request.completed_at
  );
end;
$function$;

revoke all on function public.request_current_profile_account_deletion(uuid) from public;
grant execute on function public.request_current_profile_account_deletion(uuid) to authenticated;
