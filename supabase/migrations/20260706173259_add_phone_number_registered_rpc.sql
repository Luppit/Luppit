create or replace function public.phone_number_is_registered(p_phone text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := btrim(coalesce(p_phone, ''));
  v_digits text := regexp_replace(btrim(coalesce(p_phone, '')), '\D', '', 'g');
begin
  if v_digits = '' then
    return false;
  end if;

  return exists (
    select 1
    from auth.users u
    where u.deleted_at is null
      and u.phone is not null
      and (
        btrim(u.phone) = v_phone
        or regexp_replace(btrim(u.phone), '\D', '', 'g') = v_digits
      )
  )
  or exists (
    select 1
    from public.profile p
    where p.phone is not null
      and (
        btrim(p.phone) = v_phone
        or regexp_replace(btrim(p.phone), '\D', '', 'g') = v_digits
      )
  );
end;
$$;

comment on function public.phone_number_is_registered(text)
  is 'Returns whether a phone number is already registered in active auth users or profiles without exposing account details.';

revoke all on function public.phone_number_is_registered(text) from public;
grant execute on function public.phone_number_is_registered(text) to anon, authenticated;
