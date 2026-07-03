insert into public.purchase_request_status (
  code,
  description,
  is_buyer_home_visible,
  is_seller_home_visible,
  is_terminal
)
values (
  'canceled',
  'Solicitud cancelada por el comprador.',
  true,
  false,
  true
)
on conflict (code) do update
set
  description = excluded.description,
  is_buyer_home_visible = excluded.is_buyer_home_visible,
  is_seller_home_visible = excluded.is_seller_home_visible,
  is_terminal = excluded.is_terminal;

insert into public.purchase_request_status_ui (
  status_code,
  ui_text,
  style_code
)
values (
  'canceled',
  'Cancelada',
  null
)
on conflict (status_code) do update
set
  ui_text = excluded.ui_text,
  style_code = excluded.style_code,
  updated_at = now();

insert into public.conversation_status (
  code,
  description,
  icon,
  is_terminal
)
values (
  'REQUEST_CANCELED',
  'La solicitud fue cancelada por el comprador.',
  'x-circle',
  true
)
on conflict (code) do update
set
  description = excluded.description,
  icon = excluded.icon,
  is_terminal = excluded.is_terminal;

insert into public.conversation_message_kind (code)
values ('SYSTEM')
on conflict (code) do nothing;

insert into public.conversation_action (
  code,
  label,
  icon,
  style_code,
  ui_slot
)
select
  'BUYER_CANCEL_REQUEST',
  'Cancelar solicitud',
  'trash-2',
  null,
  null
where not exists (
  select 1
  from public.conversation_action
  where code = 'BUYER_CANCEL_REQUEST'
);

create or replace function public.cancel_current_buyer_purchase_request(
  p_profile_id uuid,
  p_purchase_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_request public.purchase_request%rowtype;
  v_status public.purchase_request_status%rowtype;
  v_action_id uuid;
  v_conversations_canceled integer := 0;
begin
  if p_profile_id is null or p_purchase_request_id is null then
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

  if not exists (
    select 1
    from public.profile_role pr
    join public.role r
      on r.id = pr.role_id
    where pr.profile_id = p_profile_id
      and lower(coalesce(r.role_code, r.name)) = 'buyer'
  ) then
    raise exception 'buyer_role_required' using errcode = '42501';
  end if;

  select *
  into v_request
  from public.purchase_request
  where id = p_purchase_request_id
  for update;

  if not found then
    raise exception 'purchase_request_not_found' using errcode = 'P0002';
  end if;

  if v_request.profile_id is distinct from p_profile_id then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select *
  into v_status
  from public.purchase_request_status
  where code = v_request.status;

  if coalesce(v_status.is_terminal, false) then
    raise exception 'purchase_request_already_terminal' using errcode = '22023';
  end if;

  select id
  into v_action_id
  from public.conversation_action
  where code = 'BUYER_CANCEL_REQUEST'
  order by created_at
  limit 1;

  update public.purchase_request
  set
    status = 'canceled',
    updated_at = now()
  where id = p_purchase_request_id;

  with target_conversations as (
    select c.id, c.status_code
    from public.conversation c
    left join public.conversation_status cs
      on cs.code = c.status_code
    where c.purchase_request_id = p_purchase_request_id
      and coalesce(cs.is_terminal, false) = false
  ),
  updated_conversations as (
    update public.conversation c
    set status_code = 'REQUEST_CANCELED'
    from target_conversations tc
    where c.id = tc.id
    returning c.id, tc.status_code as from_status_code
  ),
  inserted_history as (
    insert into public.conversation_status_history (
      conversation_id,
      from_status_code,
      to_status_code,
      action_id,
      actor_profile_id,
      reason
    )
    select
      uc.id,
      uc.from_status_code,
      'REQUEST_CANCELED',
      v_action_id,
      p_profile_id,
      'buyer_purchase_request_canceled'
    from updated_conversations uc
    returning conversation_id
  ),
  resolved_deadlines as (
    update public.conversation_deadline cd
    set resolved_at = now()
    from inserted_history ih
    where cd.id = ih.conversation_id
      and cd.resolved_at is null
    returning cd.id
  ),
  inserted_messages as (
    insert into public.conversation_message (
      conversation_id,
      sender_profile_id,
      text,
      message_kind
    )
    select
      ih.conversation_id,
      p_profile_id,
      'El comprador canceló esta solicitud. La conversación quedó cerrada.',
      'SYSTEM'
    from inserted_history ih
    returning id
  )
  select count(*)
  into v_conversations_canceled
  from inserted_history;

  return jsonb_build_object(
    'purchase_request_id', p_purchase_request_id,
    'status', 'canceled',
    'conversations_canceled', coalesce(v_conversations_canceled, 0)
  );
end;
$function$;

grant execute on function public.cancel_current_buyer_purchase_request(uuid, uuid)
to authenticated;
