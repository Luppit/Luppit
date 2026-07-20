-- Repair the conversation lifecycle around pickup completion, metadata aliases,
-- delayed actions, deadlines, and participant-only reads.

alter table public.delivery_catalog
  add column if not exists method_kind text;

update public.delivery_catalog dc
set method_kind = case
  when exists (
    select 1
    from public.purchase_offer_pickup_method pm
    where pm.pickup_catalog_id = dc.id
  ) and not exists (
    select 1
    from public.purchase_offer_delivery_method dm
    where dm.delivery_catalog_id = dc.id
  ) then 'pickup'
  when exists (
    select 1
    from public.purchase_offer_delivery_method dm
    where dm.delivery_catalog_id = dc.id
  ) and not exists (
    select 1
    from public.purchase_offer_pickup_method pm
    where pm.pickup_catalog_id = dc.id
  ) then 'shipping'
  when lower(coalesce(dc.display_name, '')) like '%recog%'
    or lower(coalesce(dc.display_name, '')) like '%tienda%'
    then 'pickup'
  else 'shipping'
end
where dc.method_kind is null;

alter table public.delivery_catalog
  alter column method_kind set not null;

alter table public.delivery_catalog
  drop constraint if exists delivery_catalog_method_kind_check;

alter table public.delivery_catalog
  add constraint delivery_catalog_method_kind_check
  check (method_kind in ('shipping', 'pickup'));

create or replace function private.validate_offer_fulfillment_catalog_kind()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_method_kind text;
  v_expected_kind text;
  v_catalog_id uuid;
begin
  if tg_table_name = 'purchase_offer_delivery_method' then
    v_expected_kind := 'shipping';
    v_catalog_id := new.delivery_catalog_id;
  elsif tg_table_name = 'purchase_offer_pickup_method' then
    v_expected_kind := 'pickup';
    v_catalog_id := new.pickup_catalog_id;
  else
    raise exception 'unsupported_fulfillment_table';
  end if;

  select dc.method_kind
  into v_method_kind
  from public.delivery_catalog dc
  where dc.id = v_catalog_id;

  if v_method_kind is null then
    raise exception 'delivery_catalog_not_found';
  end if;

  if v_method_kind is distinct from v_expected_kind then
    raise exception 'delivery_catalog_kind_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_offer_delivery_catalog_kind
  on public.purchase_offer_delivery_method;
create trigger validate_offer_delivery_catalog_kind
before insert or update of delivery_catalog_id
on public.purchase_offer_delivery_method
for each row execute function private.validate_offer_fulfillment_catalog_kind();

drop trigger if exists validate_offer_pickup_catalog_kind
  on public.purchase_offer_pickup_method;
create trigger validate_offer_pickup_catalog_kind
before insert or update of pickup_catalog_id
on public.purchase_offer_pickup_method
for each row execute function private.validate_offer_fulfillment_catalog_kind();

create or replace function private.enforce_active_request_for_actionable_conversation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request_status text;
begin
  if new.purchase_request_id is null
     or new.status_code not in ('REQUEST_OPENED', 'OFFER_MADE') then
    return new;
  end if;

  select pr.status
  into v_request_status
  from public.purchase_request pr
  where pr.id = new.purchase_request_id
  for share;

  if not found then
    raise exception 'purchase_request_not_found';
  end if;

  if v_request_status is distinct from 'active' then
    raise exception 'purchase_request_not_active';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_active_request_for_actionable_conversation
  on public.conversation;
create trigger enforce_active_request_for_actionable_conversation
before insert or update of purchase_request_id, status_code
on public.conversation
for each row execute function private.enforce_active_request_for_actionable_conversation();

delete from public.conversation_deadline d
where not exists (
  select 1
  from public.conversation c
  where c.id = d.id
);

drop trigger if exists trg_broadcast_conversation_deadline_update
  on public.conversation_deadline;

alter table public.conversation_deadline
  alter column due_at type timestamptz
    using (due_at::timestamp at time zone 'UTC'),
  alter column resolved_at type timestamptz
    using (resolved_at::timestamp at time zone 'UTC');

create trigger trg_broadcast_conversation_deadline_update
after update of due_at, resolved_at, deadline_type, trigger_transition_to
on public.conversation_deadline
for each row execute function private.broadcast_conversation_deadline_change();

do $$
begin
  if not exists (
    select 1
    from pg_constraint pc
    where pc.conrelid = 'public.conversation_deadline'::regclass
      and pc.contype = 'f'
      and pc.confrelid = 'public.conversation'::regclass
  ) then
    alter table public.conversation_deadline
      add constraint conversation_deadline_conversation_id_fkey
      foreign key (id) references public.conversation(id) on delete cascade;
  end if;
end;
$$;

create index if not exists conversation_deadline_unresolved_due_idx
  on public.conversation_deadline (due_at)
  where resolved_at is null;

update public.conversation_action
set code = 'BUYER_CANCEL_PURCHASE_OFFER_ACCEPTED'
where code = 'BUYER_REJECT_OFFER'
  and ui_slot = 'AUX';

delete from public.conversation_transition t
using public.conversation_action a
where t.action_id = a.id
  and t.from_status_code = 'OFFER_MADE'
  and t.to_status_code = 'FINALIZED'
  and a.code in ('BUYER_REJECT_OFFER', 'BUYER_REJECT_OFFER_MENU',
                 'SELLER_CANCEL_OFFER', 'SELLER_CANCEL_OFFER_MENU');

delete from public.conversation_transition t
using public.conversation_action a
where t.action_id = a.id
  and t.from_status_code = 'DELAYED_ACCEPTANCE'
  and a.code in ('BUYER_CANCEL_PURCHASE_OFFER_ACCEPTED',
                 'BUYER_CANCEL_PURCHASE_OFFER_ACCEPTED_MENU');

insert into public.conversation_action_executor (
  code, execution_type, target, requires_refresh
)
values
  ('BUYER_CANCEL_PURCHASE_EXECUTOR', 'server_rpc',
   'public.buyer_cancel_purchase', true),
  ('BUYER_NOT_RECEIVED_EXECUTOR', 'server_rpc',
   'public.buyer_report_not_received', true)
on conflict (code) do update
set execution_type = excluded.execution_type,
    target = excluded.target,
    requires_refresh = excluded.requires_refresh;

insert into public.conversation_confirmation_template (
  code, title, description_template, cancel_label, confirm_label,
  confirm_style_code, cancel_icon, confirm_icon
)
values
  (
    'BUYER_CANCEL_PURCHASE_CONFIRMATION',
    '¿Cancelar compra?',
    'La compra se cerrará y esta acción no se puede deshacer.',
    'Volver',
    'Cancelar compra',
    'error',
    null,
    null
  ),
  (
    'BUYER_NOT_RECEIVED_CONFIRMATION',
    '¿Confirmas que no recibiste el pedido?',
    'La transacción se cerrará como no recibida y se notificará al vendedor.',
    'Volver',
    'No lo recibí',
    'error',
    null,
    null
  )
on conflict (code) do update
set title = excluded.title,
    description_template = excluded.description_template,
    cancel_label = excluded.cancel_label,
    confirm_label = excluded.confirm_label,
    confirm_style_code = excluded.confirm_style_code;

update public.conversation_action a
set executor_code = 'BUYER_CANCEL_PURCHASE_EXECUTOR',
    confirmation_template_id = (
      select ct.id
      from public.conversation_confirmation_template ct
      where ct.code = 'BUYER_CANCEL_PURCHASE_CONFIRMATION'
    )
where a.code in (
  'BUYER_CANCEL_PURCHASE_OFFER_ACCEPTED',
  'BUYER_CANCEL_PURCHASE_OFFER_ACCEPTED_MENU',
  'BUYER_CANCEL_PURCHASE_DELAYED',
  'BUYER_CANCEL_PURCHASE_DELAYED_MENU'
);

update public.conversation_action a
set executor_code = 'BUYER_NOT_RECEIVED_EXECUTOR',
    confirmation_template_id = (
      select ct.id
      from public.conversation_confirmation_template ct
      where ct.code = 'BUYER_NOT_RECEIVED_CONFIRMATION'
    )
where a.code in ('BUYER_NOT_RECEIVED', 'BUYER_NOT_RECEIVED_MENU');

update public.conversation_confirmation_condition_input ci
set helper_text = 'El código se envía al correo habilitado del comprador.',
    component_config = jsonb_set(
      coalesce(ci.component_config, '{}'::jsonb),
      '{helper_popup}',
      jsonb_build_object(
        'title', 'Código de entrega',
        'subtitle', 'El comprador lo recibe por correo.',
        'close_label', 'Entendido',
        'sections', jsonb_build_array(
          jsonb_build_object(
            'title', 'Quién recibe el código',
            'subtitle', 'Se envía al comprador',
            'body', 'Luppit envía un código de 4 dígitos al correo habilitado del comprador. Como vendedor, pídeselo únicamente cuando entregues el producto.'
          ),
          jsonb_build_object(
            'title', 'Si el código venció',
            'subtitle', 'Se puede generar uno nuevo',
            'body', 'Al intentar confirmar con un código vencido, Luppit enviará uno nuevo al comprador. Solicita el código más reciente antes de volver a confirmar.'
          ),
          jsonb_build_object(
            'title', 'Qué confirma el código',
            'subtitle', 'Entrega con participación del comprador',
            'body', 'Un código válido registra que el comprador participó en la confirmación de la entrega. No inventes ni reutilices códigos.'
          )
        )
      ),
      true
    )
from public.conversation_confirmation_template_condition cc
join public.conversation_confirmation_template ct
  on ct.id = cc.template_id
where ci.condition_id = cc.id
  and ct.code = 'SELLER_FINALIZE_TRANSACTION_CONFIRMATION'
  and ci.input_kind = 'otp';

insert into public.conversation_transition (
  from_status_code, action_id, actor_role_id, to_status_code,
  is_system_transition
)
select
  'DELAYED_ACCEPTANCE', a.id, r.id, 'FINALIZED', false
from public.conversation_action a
cross join public.role r
where a.code in (
  'BUYER_CANCEL_PURCHASE_DELAYED',
  'BUYER_CANCEL_PURCHASE_DELAYED_MENU'
)
  and r.role_code = 'BUYER'
  and not exists (
    select 1
    from public.conversation_transition t
    where t.from_status_code = 'DELAYED_ACCEPTANCE'
      and t.action_id = a.id
      and t.actor_role_id = r.id
  );

insert into public.conversation_action (
  code, label, ui_slot, icon, style_code, executor_code,
  confirmation_template_id
)
select
  'SYSTEM_FINALIZE_PICKUP', 'Finalizar retiro validado', null, null, null,
  null, null
where not exists (
  select 1
  from public.conversation_action a
  where a.code = 'SYSTEM_FINALIZE_PICKUP'
);

insert into public.conversation_action (
  code, label, ui_slot, icon, style_code, executor_code,
  confirmation_template_id
)
select
  system_action.code,
  system_action.label,
  null,
  null,
  null,
  null,
  null
from (
  values
    ('SYSTEM_CLOSE_SIBLING_OFFER', 'Cerrar oferta no seleccionada'),
    ('SYSTEM_CLOSE_SIBLING_REQUEST', 'Cerrar conversación no seleccionada')
) as system_action(code, label)
where not exists (
  select 1
  from public.conversation_action a
  where a.code = system_action.code
);

insert into public.conversation_transition (
  from_status_code, action_id, actor_role_id, to_status_code,
  is_system_transition
)
select
  'SENT_SHIPMENT', a.id, r.id, 'FINALIZED', true
from public.conversation_action a
cross join public.role r
where a.code = 'SYSTEM_FINALIZE_PICKUP'
  and r.role_code = 'SELLER'
  and not exists (
    select 1
    from public.conversation_transition t
    where t.from_status_code = 'SENT_SHIPMENT'
      and t.action_id = a.id
      and t.actor_role_id = r.id
      and coalesce(t.is_system_transition, false)
  );

insert into public.conversation_transition (
  from_status_code, action_id, actor_role_id, to_status_code,
  is_system_transition
)
select
  system_transition.from_status_code,
  a.id,
  null,
  system_transition.to_status_code,
  true
from (
  values
    ('OFFER_MADE', 'SYSTEM_CLOSE_SIBLING_OFFER', 'OFFER_REJECTED'),
    ('REQUEST_OPENED', 'SYSTEM_CLOSE_SIBLING_REQUEST', 'REQUEST_DISCARDED')
) as system_transition(from_status_code, action_code, to_status_code)
join public.conversation_action a
  on a.code = system_transition.action_code
where not exists (
  select 1
  from public.conversation_transition t
  where t.from_status_code = system_transition.from_status_code
    and t.action_id = a.id
    and t.actor_role_id is null
    and t.to_status_code = system_transition.to_status_code
    and coalesce(t.is_system_transition, false)
);

create unique index if not exists conversation_action_code_unique_idx
  on public.conversation_action (code)
  where code is not null;

create unique index if not exists conversation_transition_actor_unique_idx
  on public.conversation_transition (
    from_status_code, action_id, actor_role_id
  )
  where coalesce(is_system_transition, false) = false;

create unique index if not exists conversation_status_role_action_unique_idx
  on public.conversation_status_role_action (status_code, role_id, action_id);

create or replace function private.prepare_conversation_transaction_otp_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_buyer_profile_id uuid;
  v_buyer_email text;
  v_buyer_email_opt_in boolean;
begin
  if new.otp_type_code <> 'conversation_transaction' then
    return new;
  end if;

  select c.buyer_profile_id, nullif(lower(btrim(p.email)), ''),
         coalesce(p.email_opt_in, false) and p.email_opt_in_at is not null
  into v_buyer_profile_id, v_buyer_email, v_buyer_email_opt_in
  from public.conversation c
  left join public.profile p on p.id = c.buyer_profile_id
  where c.id = new.conversation_id;

  if v_buyer_profile_id is null then
    raise exception 'buyer_profile_not_configured';
  end if;

  if not v_buyer_email_opt_in or v_buyer_email is null then
    raise exception 'transaction_code_delivery_unavailable';
  end if;

  new.target_profile_id := v_buyer_profile_id;
  new.email := null;
  return new;
end;
$$;

drop trigger if exists prepare_conversation_transaction_otp_row
  on public.otp_code;
create trigger prepare_conversation_transaction_otp_row
before insert on public.otp_code
for each row execute function private.prepare_conversation_transaction_otp_row();

update public.otp_code oc
set target_profile_id = c.buyer_profile_id
from public.conversation c
where oc.otp_type_code = 'conversation_transaction'
  and oc.conversation_id = c.id
  and oc.target_profile_id is null;

create or replace function private.issue_conversation_transaction_otp(
  p_conversation_id uuid,
  p_seller_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net
as $$
declare
  v_conversation public.conversation%rowtype;
  v_email text;
  v_email_opt_in boolean;
  v_recent_count integer;
  v_last_created_at timestamptz;
  v_otp_bytes bytea;
  v_otp text;
  v_otp_hash text;
  v_project_url text;
  v_anon_key text;
  v_request_id bigint;
begin
  select c.*
  into v_conversation
  from public.conversation c
  where c.id = p_conversation_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'conversation_not_found'
    );
  end if;

  if v_conversation.seller_profile_id is distinct from p_seller_profile_id then
    return jsonb_build_object(
      'success', false,
      'error_code', 'profile_not_allowed'
    );
  end if;

  if v_conversation.status_code not in ('SELLER_ACCEPTED', 'DELAYED_ACCEPTANCE') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'invalid_transition_for_current_status'
    );
  end if;

  if not exists (
    select 1
    from public.purchase_offer_pickup_method pm
    where pm.purchase_offer_id = v_conversation.purchase_offer_id
  ) or exists (
    select 1
    from public.purchase_offer_delivery_method dm
    where dm.purchase_offer_id = v_conversation.purchase_offer_id
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'delivery_method_not_pickup_only'
    );
  end if;

  select nullif(lower(btrim(p.email)), ''),
         coalesce(p.email_opt_in, false) and p.email_opt_in_at is not null
  into v_email, v_email_opt_in
  from public.profile p
  where p.id = v_conversation.buyer_profile_id;

  if not v_email_opt_in or v_email is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'transaction_code_delivery_unavailable'
    );
  end if;

  select count(*), max(oc.created_at)
  into v_recent_count, v_last_created_at
  from public.otp_code oc
  where oc.otp_type_code = 'conversation_transaction'
    and oc.conversation_id = p_conversation_id
    and oc.created_at >= now() - interval '1 hour';

  if v_recent_count >= 5 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'transaction_code_rate_limited'
    );
  end if;

  if v_last_created_at is not null
     and v_last_created_at > now() - interval '60 seconds' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'transaction_code_resend_too_soon'
    );
  end if;

  select ds.decrypted_secret
  into v_project_url
  from vault.decrypted_secrets ds
  where ds.name = 'project_url'
  limit 1;

  select ds.decrypted_secret
  into v_anon_key
  from vault.decrypted_secrets ds
  where ds.name = 'anon_key'
  limit 1;

  if v_project_url is null or v_anon_key is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'otp_delivery_not_configured'
    );
  end if;

  v_otp_bytes := extensions.gen_random_bytes(2);
  v_otp := lpad(
    (((get_byte(v_otp_bytes, 0)::integer << 8)
       + get_byte(v_otp_bytes, 1)::integer) % 10000)::text,
    4,
    '0'
  );
  v_otp_hash := extensions.crypt(v_otp, extensions.gen_salt('bf'));

  update public.otp_code
  set invalidated_at = now()
  where otp_type_code = 'conversation_transaction'
    and conversation_id = p_conversation_id
    and consumed_at is null
    and invalidated_at is null;

  insert into public.otp_code (
    otp_type_code, target_profile_id, conversation_id, email, code_hash,
    created_by_profile_id, created_at, expires_at
  )
  values (
    'conversation_transaction', v_conversation.buyer_profile_id,
    p_conversation_id, null, v_otp_hash, p_seller_profile_id,
    now(), now() + interval '10 minutes'
  );

  select net.http_post(
    url := rtrim(v_project_url, '/') || '/functions/v1/send_otp_delivery',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object('email', v_email, 'otp', v_otp),
    timeout_milliseconds := 10000
  )
  into v_request_id;

  return jsonb_build_object(
    'success', true,
    'otp_reissued', true,
    'otp_delivery_requested', true,
    'otp_request_id', v_request_id
  );
end;
$$;

revoke all on function private.issue_conversation_transaction_otp(uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.prepare_conversation_transaction_otp_row()
  from public, anon, authenticated;
revoke all on function private.validate_offer_fulfillment_catalog_kind()
  from public, anon, authenticated;
revoke all on function private.enforce_active_request_for_actionable_conversation()
  from public, anon, authenticated;

alter function public.buyer_accept_offer(uuid, uuid, text, jsonb)
  rename to buyer_accept_offer_base_20260716;
alter function public.buyer_confirm_received(uuid, uuid, text, jsonb)
  rename to buyer_confirm_received_base_20260716;
alter function public.seller_concretar_request(uuid, uuid, text, jsonb)
  rename to seller_concretar_request_base_20260716;
alter function public.buyer_reject_offer(uuid, uuid, text, jsonb)
  rename to buyer_reject_offer_base_20260716;
alter function public.seller_cancel_offer(uuid, uuid, text, jsonb)
  rename to seller_cancel_offer_base_20260716;
alter function public.seller_discard_request_conversation(uuid, uuid, text, jsonb)
  rename to seller_discard_request_conversation_base_20260716;
alter function public.submit_conversation_rating(uuid, uuid, text, jsonb)
  rename to submit_conversation_rating_base_20260716;
alter function public.get_conversation_view(uuid, uuid)
  rename to get_conversation_view_base_20260716;
alter function public.get_conversation_timeline(uuid)
  rename to get_conversation_timeline_base_20260716;

create function public.buyer_accept_offer(
  p_conversation_id uuid,
  p_profile_id uuid,
  p_action_code text default 'BUYER_ACCEPT_OFFER',
  p_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
  v_purchase_request_id uuid;
  v_sibling record;
  v_system_action_id uuid;
  v_closed_sibling_count integer := 0;
begin
  if upper(btrim(coalesce(p_action_code, ''))) not in (
    'BUYER_ACCEPT_OFFER', 'BUYER_ACCEPT_OFFER_MENU'
  ) then
    raise exception 'invalid_action_code';
  end if;

  v_result := public.buyer_accept_offer_base_20260716(
    p_conversation_id,
    p_profile_id,
    'BUYER_ACCEPT_OFFER',
    p_payload
  );

  v_purchase_request_id := nullif(v_result ->> 'purchase_request_id', '')::uuid;

  for v_sibling in
    select c.id, c.status_code
    from public.conversation c
    where c.purchase_request_id = v_purchase_request_id
      and c.id <> p_conversation_id
      and c.status_code in ('REQUEST_OPENED', 'OFFER_MADE')
    order by c.id
    for update
  loop
    select a.id
    into v_system_action_id
    from public.conversation_action a
    where a.code = case v_sibling.status_code
      when 'OFFER_MADE' then 'SYSTEM_CLOSE_SIBLING_OFFER'
      else 'SYSTEM_CLOSE_SIBLING_REQUEST'
    end;

    update public.conversation
    set status_code = case v_sibling.status_code
      when 'OFFER_MADE' then 'OFFER_REJECTED'
      else 'REQUEST_DISCARDED'
    end
    where id = v_sibling.id;

    insert into public.conversation_status_history (
      conversation_id, from_status_code, to_status_code, action_id,
      actor_profile_id, reason
    )
    values (
      v_sibling.id,
      v_sibling.status_code,
      case v_sibling.status_code
        when 'OFFER_MADE' then 'OFFER_REJECTED'
        else 'REQUEST_DISCARDED'
      end,
      v_system_action_id,
      null,
      'another_offer_accepted'
    );

    insert into public.conversation_message (
      conversation_id, sender_profile_id, text, message_kind
    )
    values (
      v_sibling.id,
      null,
      'El comprador seleccionó otra oferta para esta solicitud.',
      'SYSTEM'
    );

    v_closed_sibling_count := v_closed_sibling_count + 1;
  end loop;

  return v_result || jsonb_build_object(
    'closed_sibling_conversation_count', v_closed_sibling_count
  );
end;
$$;

create function public.buyer_confirm_received(
  p_conversation_id uuid,
  p_profile_id uuid,
  p_action_code text default 'BUYER_CONFIRM_RECEIVED',
  p_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
begin
  if upper(btrim(coalesce(p_action_code, ''))) not in (
    'BUYER_CONFIRM_RECEIVED', 'BUYER_CONFIRM_RECEIVED_MENU'
  ) then
    raise exception 'invalid_action_code';
  end if;

  v_result := public.buyer_confirm_received_base_20260716(
    p_conversation_id,
    p_profile_id,
    'BUYER_CONFIRM_RECEIVED',
    p_payload
  );

  if coalesce(
    (v_result ->> 'ok')::boolean,
    (v_result ->> 'success')::boolean,
    false
  ) then
    update public.conversation_deadline
    set resolved_at = now()
    where id = p_conversation_id
      and resolved_at is null;
  end if;

  return v_result;
end;
$$;

create function public.seller_concretar_request(
  p_conversation_id uuid,
  p_profile_id uuid,
  p_action_code text default 'SELLER_CONCRETAR',
  p_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_conversation public.conversation%rowtype;
  v_has_shipping boolean;
  v_has_pickup boolean;
  v_email text;
  v_email_opt_in boolean;
begin
  perform private.assert_profile_owned(p_profile_id);

  if upper(btrim(coalesce(p_action_code, ''))) not in (
    'SELLER_CONCRETAR', 'SELLER_CONCRETAR_MENU'
  ) then
    raise exception 'invalid_action_code';
  end if;

  select c.*
  into v_conversation
  from public.conversation c
  where c.id = p_conversation_id
  for update;

  if not found then
    raise exception 'conversation_not_found';
  end if;

  if v_conversation.seller_profile_id is distinct from p_profile_id then
    raise exception 'profile_not_allowed';
  end if;

  select
    exists (
      select 1 from public.purchase_offer_delivery_method dm
      where dm.purchase_offer_id = v_conversation.purchase_offer_id
    ),
    exists (
      select 1 from public.purchase_offer_pickup_method pm
      where pm.purchase_offer_id = v_conversation.purchase_offer_id
    )
  into v_has_shipping, v_has_pickup;

  if v_has_shipping and v_has_pickup then
    raise exception 'fulfillment_selection_required';
  end if;

  if v_has_pickup then
    select nullif(lower(btrim(p.email)), ''),
           coalesce(p.email_opt_in, false) and p.email_opt_in_at is not null
    into v_email, v_email_opt_in
    from public.profile p
    where p.id = v_conversation.buyer_profile_id;

    if not v_email_opt_in or v_email is null then
      raise exception 'transaction_code_delivery_unavailable';
    end if;
  end if;

  return public.seller_concretar_request_base_20260716(
    p_conversation_id,
    p_profile_id,
    'SELLER_CONCRETAR',
    p_payload
  );
end;
$$;

create function public.buyer_reject_offer(
  p_conversation_id uuid,
  p_profile_id uuid,
  p_action_code text default 'BUYER_REJECT_OFFER',
  p_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform private.assert_profile_owned(p_profile_id);
  perform 1
  from public.conversation c
  where c.id = p_conversation_id
    and c.buyer_profile_id = p_profile_id
  for update;

  if not found then
    raise exception 'conversation_not_found';
  end if;

  if upper(btrim(coalesce(p_action_code, ''))) not in (
    'BUYER_REJECT_OFFER', 'BUYER_REJECT_OFFER_MENU'
  ) then
    raise exception 'invalid_action_code';
  end if;

  return public.buyer_reject_offer_base_20260716(
    p_conversation_id, p_profile_id,
    upper(btrim(p_action_code)), p_payload
  );
end;
$$;

create function public.seller_cancel_offer(
  p_conversation_id uuid,
  p_profile_id uuid,
  p_action_code text default 'SELLER_CANCEL_OFFER',
  p_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
  v_conversation_still_exists boolean;
begin
  perform private.assert_profile_owned(p_profile_id);
  perform 1
  from public.conversation c
  where c.id = p_conversation_id
    and c.seller_profile_id = p_profile_id
  for update;

  if not found then
    raise exception 'conversation_not_found';
  end if;

  if upper(btrim(coalesce(p_action_code, ''))) not in (
    'SELLER_CANCEL_OFFER', 'SELLER_CANCEL_OFFER_MENU'
  ) then
    raise exception 'invalid_action_code';
  end if;

  v_result := public.seller_cancel_offer_base_20260716(
    p_conversation_id, p_profile_id,
    upper(btrim(p_action_code)), p_payload
  );

  select exists (
    select 1 from public.conversation c where c.id = p_conversation_id
  )
  into v_conversation_still_exists;

  if v_conversation_still_exists then
    return (v_result - 'purged_conversation_id' - 'deleted_conversation_id')
      || jsonb_build_object('conversation_deleted', false);
  end if;

  return v_result || jsonb_build_object('conversation_deleted', true);
end;
$$;

create function public.seller_discard_request_conversation(
  p_conversation_id uuid,
  p_profile_id uuid,
  p_action_code text default 'SELLER_DISCARD_REQUEST',
  p_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform private.assert_profile_owned(p_profile_id);
  perform 1
  from public.conversation c
  where c.id = p_conversation_id
    and c.seller_profile_id = p_profile_id
  for update;

  if not found then
    raise exception 'conversation_not_found';
  end if;

  if upper(btrim(coalesce(p_action_code, ''))) not in (
    'SELLER_DISCARD_REQUEST', 'SELLER_DISCARD_REQUEST_MENU'
  ) then
    raise exception 'invalid_action_code';
  end if;

  return public.seller_discard_request_conversation_base_20260716(
    p_conversation_id, p_profile_id,
    upper(btrim(p_action_code)), p_payload
  );
end;
$$;

create function public.buyer_cancel_purchase(
  p_conversation_id uuid,
  p_profile_id uuid,
  p_action_code text,
  p_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_conversation public.conversation%rowtype;
  v_action_id uuid;
  v_buyer_role_id uuid;
  v_to_status_code text;
  v_action_code text := upper(btrim(coalesce(p_action_code, '')));
begin
  perform private.assert_profile_owned(p_profile_id);

  if v_action_code not in (
    'BUYER_CANCEL_PURCHASE_OFFER_ACCEPTED',
    'BUYER_CANCEL_PURCHASE_OFFER_ACCEPTED_MENU',
    'BUYER_CANCEL_PURCHASE_DELAYED',
    'BUYER_CANCEL_PURCHASE_DELAYED_MENU'
  ) then
    raise exception 'invalid_action_code';
  end if;

  select c.*
  into v_conversation
  from public.conversation c
  where c.id = p_conversation_id
  for update;

  if not found then
    raise exception 'conversation_not_found';
  end if;

  if v_conversation.buyer_profile_id is distinct from p_profile_id then
    raise exception 'profile_not_allowed';
  end if;

  if v_conversation.status_code = 'OFFER_ACCEPTED'
     and v_action_code not in (
       'BUYER_CANCEL_PURCHASE_OFFER_ACCEPTED',
       'BUYER_CANCEL_PURCHASE_OFFER_ACCEPTED_MENU'
     ) then
    raise exception 'invalid_transition_for_current_status';
  elsif v_conversation.status_code = 'DELAYED_ACCEPTANCE'
     and v_action_code not in (
       'BUYER_CANCEL_PURCHASE_DELAYED',
       'BUYER_CANCEL_PURCHASE_DELAYED_MENU'
     ) then
    raise exception 'invalid_transition_for_current_status';
  elsif v_conversation.status_code not in ('OFFER_ACCEPTED', 'DELAYED_ACCEPTANCE') then
    raise exception 'invalid_transition_for_current_status';
  end if;

  select a.id into v_action_id
  from public.conversation_action a
  where a.code = v_action_code;

  select r.id into v_buyer_role_id
  from public.role r
  where r.role_code = 'BUYER';

  select t.to_status_code
  into v_to_status_code
  from public.conversation_transition t
  where t.from_status_code = v_conversation.status_code
    and t.action_id = v_action_id
    and t.actor_role_id = v_buyer_role_id
    and coalesce(t.is_system_transition, false) = false;

  if v_to_status_code is distinct from 'FINALIZED' then
    raise exception 'invalid_transition_for_current_status';
  end if;

  update public.conversation
  set status_code = v_to_status_code
  where id = p_conversation_id;

  update public.conversation_deadline
  set resolved_at = now()
  where id = p_conversation_id
    and resolved_at is null;

  update public.otp_code
  set invalidated_at = now()
  where otp_type_code = 'conversation_transaction'
    and conversation_id = p_conversation_id
    and consumed_at is null
    and invalidated_at is null;

  insert into public.conversation_status_history (
    conversation_id, from_status_code, to_status_code, action_id,
    actor_profile_id, reason
  )
  values (
    p_conversation_id, v_conversation.status_code, v_to_status_code,
    v_action_id, p_profile_id, 'buyer_cancelled_purchase'
  );

  insert into public.conversation_message (
    conversation_id, sender_profile_id, text, message_kind
  )
  values (
    p_conversation_id, null,
    'El comprador canceló la compra.', 'SYSTEM'
  );

  return jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'action_code', v_action_code,
    'from_status_code', v_conversation.status_code,
    'to_status_code', v_to_status_code
  );
end;
$$;

create function public.buyer_report_not_received(
  p_conversation_id uuid,
  p_profile_id uuid,
  p_action_code text,
  p_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_conversation public.conversation%rowtype;
  v_action_id uuid;
  v_buyer_role_id uuid;
  v_to_status_code text;
  v_action_code text := upper(btrim(coalesce(p_action_code, '')));
begin
  perform private.assert_profile_owned(p_profile_id);

  if v_action_code not in ('BUYER_NOT_RECEIVED', 'BUYER_NOT_RECEIVED_MENU') then
    raise exception 'invalid_action_code';
  end if;

  select c.*
  into v_conversation
  from public.conversation c
  where c.id = p_conversation_id
  for update;

  if not found then
    raise exception 'conversation_not_found';
  end if;

  if v_conversation.buyer_profile_id is distinct from p_profile_id then
    raise exception 'profile_not_allowed';
  end if;

  if v_conversation.status_code <> 'DELAYED_SHIPMENT' then
    raise exception 'invalid_transition_for_current_status';
  end if;

  select a.id into v_action_id
  from public.conversation_action a
  where a.code = v_action_code;

  select r.id into v_buyer_role_id
  from public.role r
  where r.role_code = 'BUYER';

  select t.to_status_code
  into v_to_status_code
  from public.conversation_transition t
  where t.from_status_code = v_conversation.status_code
    and t.action_id = v_action_id
    and t.actor_role_id = v_buyer_role_id
    and coalesce(t.is_system_transition, false) = false;

  if v_to_status_code is distinct from 'FINALIZED' then
    raise exception 'invalid_transition_for_current_status';
  end if;

  update public.conversation
  set status_code = v_to_status_code
  where id = p_conversation_id;

  update public.conversation_deadline
  set resolved_at = now()
  where id = p_conversation_id
    and resolved_at is null;

  insert into public.conversation_status_history (
    conversation_id, from_status_code, to_status_code, action_id,
    actor_profile_id, reason
  )
  values (
    p_conversation_id, v_conversation.status_code, v_to_status_code,
    v_action_id, p_profile_id, 'buyer_reported_not_received'
  );

  insert into public.conversation_message (
    conversation_id, sender_profile_id, text, message_kind
  )
  values (
    p_conversation_id, null,
    'El comprador informó que no recibió el pedido.', 'SYSTEM'
  );

  return jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'action_code', v_action_code,
    'from_status_code', v_conversation.status_code,
    'to_status_code', v_to_status_code,
    'outcome', 'not_received'
  );
end;
$$;

create function public.submit_conversation_rating(
  p_conversation_id uuid,
  p_profile_id uuid,
  p_action_code text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_conversation public.conversation%rowtype;
  v_role_id uuid;
  v_canonical_action_code text;
begin
  perform private.assert_profile_owned(p_profile_id);

  select c.*
  into v_conversation
  from public.conversation c
  where c.id = p_conversation_id
  for update;

  if not found then
    raise exception 'conversation_not_found';
  end if;

  if p_profile_id = v_conversation.buyer_profile_id then
    select r.id into v_role_id from public.role r where r.role_code = 'BUYER';
    if upper(btrim(coalesce(p_action_code, ''))) not in (
      'BUYER_RATE_SELLER', 'BUYER_RATE_SELLER_MENU'
    ) then
      raise exception 'invalid_action_code';
    end if;
    v_canonical_action_code := 'BUYER_RATE_SELLER';
  elsif p_profile_id = v_conversation.seller_profile_id then
    select r.id into v_role_id from public.role r where r.role_code = 'SELLER';
    if upper(btrim(coalesce(p_action_code, ''))) not in (
      'SELLER_RATE_BUYER', 'SELLER_RATE_BUYER_MENU'
    ) then
      raise exception 'invalid_action_code';
    end if;
    v_canonical_action_code := 'SELLER_RATE_BUYER';
  else
    raise exception 'profile_not_allowed';
  end if;

  if not exists (
    select 1
    from public.conversation_status_role_action sra
    join public.conversation_action a on a.id = sra.action_id
    where sra.status_code = v_conversation.status_code
      and sra.role_id = v_role_id
      and a.code = upper(btrim(p_action_code))
  ) then
    raise exception 'rating_action_not_available';
  end if;

  if exists (
    select 1
    from public.conversation_rating cr
    where cr.conversation_id = p_conversation_id
      and cr.rater_profile_id = p_profile_id
      and cr.action_code = v_canonical_action_code
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'rating_already_submitted'
    );
  end if;

  return public.submit_conversation_rating_base_20260716(
    p_conversation_id, p_profile_id, v_canonical_action_code, p_payload
  );
end;
$$;

create function public.get_conversation_view(
  p_conversation_id uuid,
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
  v_actions jsonb;
  v_has_buyer_rating boolean;
  v_has_seller_rating boolean;
begin
  v_result := public.get_conversation_view_base_20260716(
    p_conversation_id, p_profile_id
  );

  select
    exists (
      select 1
      from public.conversation_rating cr
      where cr.conversation_id = p_conversation_id
        and cr.rater_profile_id = p_profile_id
        and cr.action_code = 'BUYER_RATE_SELLER'
    ),
    exists (
      select 1
      from public.conversation_rating cr
      where cr.conversation_id = p_conversation_id
        and cr.rater_profile_id = p_profile_id
        and cr.action_code = 'SELLER_RATE_BUYER'
    )
  into v_has_buyer_rating, v_has_seller_rating;

  select coalesce(jsonb_agg(action_row), '[]'::jsonb)
  into v_actions
  from jsonb_array_elements(coalesce(v_result -> 'actions', '[]'::jsonb))
    as action_row
  where not (
    v_has_buyer_rating
    and action_row ->> 'code' in (
      'BUYER_RATE_SELLER', 'BUYER_RATE_SELLER_MENU'
    )
  )
  and not (
    v_has_seller_rating
    and action_row ->> 'code' in (
      'SELLER_RATE_BUYER', 'SELLER_RATE_BUYER_MENU'
    )
  );

  return jsonb_set(v_result, '{actions}', v_actions, true);
end;
$$;

create function public.get_conversation_timeline(p_conversation_id uuid)
returns table (
  sort_order integer,
  status_code text,
  label text,
  icon text,
  reached_at timestamptz,
  reached_at_label text,
  is_next boolean,
  is_completed boolean,
  pre_label text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.conversation c
    join public.profile p
      on p.id in (c.buyer_profile_id, c.seller_profile_id)
    where c.id = p_conversation_id
      and p.user_id = (select auth.uid())
  ) then
    raise exception 'conversation_not_found_or_not_allowed';
  end if;

  return query
  select timeline.*
  from public.get_conversation_timeline_base_20260716(p_conversation_id)
    as timeline;
end;
$$;

create or replace function public.seller_finalize_transaction(
  p_conversation_id uuid,
  p_profile_id uuid,
  p_action_code text default 'SELLER_FINALIZE',
  p_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_conversation public.conversation%rowtype;
  v_action_code text := upper(btrim(coalesce(p_action_code, '')));
  v_action_id uuid;
  v_system_action_id uuid;
  v_seller_role_id uuid;
  v_buyer_role_id uuid;
  v_to_status_code text;
  v_has_shipping boolean;
  v_has_pickup boolean;
  v_shipping_max_days integer;
  v_deadline_due_at_source text;
  v_deadline_trigger_transition_to text;
  v_transaction_code text;
  v_otp public.otp_code%rowtype;
  v_issuance jsonb;
  v_next_attempt_count integer;
begin
  perform private.assert_profile_owned(p_profile_id);

  if v_action_code not in ('SELLER_FINALIZE', 'SELLER_FINALIZE_MENU') then
    raise exception 'invalid_action_code';
  end if;

  select c.*
  into v_conversation
  from public.conversation c
  where c.id = p_conversation_id
  for update;

  if not found then
    raise exception 'conversation_not_found';
  end if;

  if v_conversation.seller_profile_id is distinct from p_profile_id then
    raise exception 'profile_not_allowed';
  end if;

  select r.id into v_seller_role_id
  from public.role r where r.role_code = 'SELLER';
  select r.id into v_buyer_role_id
  from public.role r where r.role_code = 'BUYER';

  select a.id into v_action_id
  from public.conversation_action a
  where a.code = v_action_code;

  select t.to_status_code
  into v_to_status_code
  from public.conversation_transition t
  where t.from_status_code = v_conversation.status_code
    and t.action_id = v_action_id
    and t.actor_role_id = v_seller_role_id
    and coalesce(t.is_system_transition, false) = false;

  if v_to_status_code is distinct from 'SENT_SHIPMENT' then
    raise exception 'invalid_transition_for_current_status';
  end if;

  select
    exists (
      select 1 from public.purchase_offer_delivery_method dm
      where dm.purchase_offer_id = v_conversation.purchase_offer_id
    ),
    exists (
      select 1 from public.purchase_offer_pickup_method pm
      where pm.purchase_offer_id = v_conversation.purchase_offer_id
    ),
    (
      select dm.shipping_max_days
      from public.purchase_offer_delivery_method dm
      where dm.purchase_offer_id = v_conversation.purchase_offer_id
      order by dm.created_at, dm.id
      limit 1
    )
  into v_has_shipping, v_has_pickup, v_shipping_max_days;

  if not v_has_shipping and not v_has_pickup then
    raise exception 'delivery_method_not_configured';
  end if;

  if v_has_shipping and v_has_pickup then
    raise exception 'fulfillment_selection_required';
  end if;

  if v_has_pickup then
    if p_payload is not null and jsonb_typeof(p_payload) = 'object' then
      select nullif(btrim(value), '')
      into v_transaction_code
      from jsonb_each_text(p_payload)
      where lower(key) like '%transaction_code%'
         or lower(key) like '%otp%'
      order by case
        when lower(key) = 'transaction_code' then 0
        when lower(key) = 'otp' then 1
        else 2
      end
      limit 1;
    end if;

    if v_transaction_code is null then
      return jsonb_build_object(
        'success', false,
        'error_code', 'otp_required'
      );
    end if;

    if v_transaction_code !~ '^[0-9]{4}$' then
      return jsonb_build_object(
        'success', false,
        'error_code', 'invalid_transaction_code_format'
      );
    end if;

    select oc.*
    into v_otp
    from public.otp_code oc
    where oc.otp_type_code = 'conversation_transaction'
      and oc.conversation_id = p_conversation_id
    order by oc.created_at desc
    limit 1
    for update;

    if not found or v_otp.expires_at <= now() then
      v_issuance := private.issue_conversation_transaction_otp(
        p_conversation_id, p_profile_id
      );

      if coalesce((v_issuance ->> 'success')::boolean, false) = false then
        return v_issuance;
      end if;

      return jsonb_build_object(
        'success', false,
        'error_code', case
          when v_otp.id is null
            then 'transaction_code_not_found_new_code_sent'
          else 'transaction_code_expired_new_code_sent'
        end,
        'otp_reissued', true,
        'otp_delivery_requested', true
      );
    end if;

    if v_otp.consumed_at is not null then
      return jsonb_build_object(
        'success', false,
        'error_code', 'transaction_code_already_used'
      );
    end if;

    if v_otp.invalidated_at is not null then
      return jsonb_build_object(
        'success', false,
        'error_code', case
          when v_otp.attempt_count >= 5
            then 'transaction_code_attempts_exceeded'
          else 'transaction_code_invalidated'
        end
      );
    end if;

    if extensions.crypt(v_transaction_code, v_otp.code_hash) <> v_otp.code_hash then
      v_next_attempt_count := v_otp.attempt_count + 1;

      update public.otp_code
      set attempt_count = v_next_attempt_count,
          last_attempt_at = now(),
          invalidated_at = case
            when v_next_attempt_count >= 5 then now()
            else invalidated_at
          end
      where id = v_otp.id;

      return jsonb_build_object(
        'success', false,
        'error_code', case
          when v_next_attempt_count >= 5
            then 'transaction_code_attempts_exceeded'
          else 'invalid_transaction_code'
        end,
        'attempts_remaining', greatest(5 - v_next_attempt_count, 0)
      );
    end if;

    update public.otp_code
    set consumed_by_profile_id = p_profile_id,
        consumed_at = now(),
        last_attempt_at = now()
    where id = v_otp.id;
  end if;

  update public.conversation
  set status_code = v_to_status_code
  where id = p_conversation_id;

  insert into public.conversation_status_history (
    conversation_id, from_status_code, to_status_code, action_id,
    actor_profile_id, reason
  )
  values (
    p_conversation_id, v_conversation.status_code, v_to_status_code,
    v_action_id, p_profile_id,
    case when v_has_pickup then 'otp_validated' else null end
  );

  if v_has_shipping and coalesce(v_shipping_max_days, 0) > 0 then
    select d.due_at_source, d.default_trigger_transition_to
    into v_deadline_due_at_source, v_deadline_trigger_transition_to
    from public.deadline_type_catalog d
    where d.code = 'SENT_SHIPMENT_EXPIRATION';

    if v_deadline_due_at_source is distinct from 'OFFER_DELIVERY_MAX_DAYS'
       or v_deadline_trigger_transition_to is null then
      raise exception 'sent_shipment_deadline_policy_invalid';
    end if;

    insert into public.conversation_deadline (
      id, deadline_type, due_at, resolved_at, trigger_transition_to
    )
    values (
      p_conversation_id, 'SENT_SHIPMENT_EXPIRATION',
      now() + make_interval(days => v_shipping_max_days),
      null, v_deadline_trigger_transition_to
    )
    on conflict (id) do update
    set deadline_type = excluded.deadline_type,
        due_at = excluded.due_at,
        resolved_at = null,
        trigger_transition_to = excluded.trigger_transition_to;

    insert into public.conversation_message (
      conversation_id, sender_profile_id, text, message_kind
    )
    values (
      p_conversation_id, null,
      format(
        'El vendedor realizó el envío. El tiempo máximo de entrega es de %s día(s).',
        v_shipping_max_days
      ),
      'SYSTEM'
    );
  elsif v_has_shipping then
    update public.conversation_deadline
    set resolved_at = now()
    where id = p_conversation_id and resolved_at is null;

    insert into public.conversation_message (
      conversation_id, sender_profile_id, text, message_kind
    )
    values (
      p_conversation_id, null, 'El vendedor realizó el envío.', 'SYSTEM'
    );
  else
    update public.conversation_deadline
    set resolved_at = now()
    where id = p_conversation_id and resolved_at is null;

    select a.id into v_system_action_id
    from public.conversation_action a
    where a.code = 'SYSTEM_FINALIZE_PICKUP';

    if not exists (
      select 1
      from public.conversation_transition t
      where t.from_status_code = 'SENT_SHIPMENT'
        and t.to_status_code = 'FINALIZED'
        and t.action_id = v_system_action_id
        and t.actor_role_id = v_seller_role_id
        and coalesce(t.is_system_transition, false)
    ) then
      raise exception 'pickup_finalize_transition_not_configured';
    end if;

    update public.conversation
    set status_code = 'FINALIZED'
    where id = p_conversation_id;

    insert into public.conversation_status_history (
      conversation_id, from_status_code, to_status_code, action_id,
      actor_profile_id, reason
    )
    values (
      p_conversation_id, 'SENT_SHIPMENT', 'FINALIZED',
      v_system_action_id, p_profile_id, 'buyer_otp_validated'
    );

    insert into public.conversation_message (
      conversation_id, sender_profile_id, text, message_kind
    )
    values (
      p_conversation_id, null,
      'La entrega en tienda fue confirmada con el código del comprador.',
      'SYSTEM'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'action_code', v_action_code,
    'from_status_code', v_conversation.status_code,
    'to_status_code', v_to_status_code,
    'final_to_status_code', case
      when v_has_pickup then 'FINALIZED'
      else v_to_status_code
    end,
    'otp_received', v_has_pickup,
    'auto_confirmed', v_has_pickup
  );
end;
$$;

revoke all on function public.buyer_accept_offer_base_20260716(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.buyer_confirm_received_base_20260716(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.seller_concretar_request_base_20260716(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.buyer_reject_offer_base_20260716(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.seller_cancel_offer_base_20260716(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.seller_discard_request_conversation_base_20260716(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.submit_conversation_rating_base_20260716(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.get_conversation_view_base_20260716(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_conversation_timeline_base_20260716(uuid)
  from public, anon, authenticated;

revoke all on function public.buyer_accept_offer(uuid, uuid, text, jsonb)
  from public, anon;
revoke all on function public.buyer_confirm_received(uuid, uuid, text, jsonb)
  from public, anon;
revoke all on function public.seller_concretar_request(uuid, uuid, text, jsonb)
  from public, anon;
revoke all on function public.buyer_reject_offer(uuid, uuid, text, jsonb)
  from public, anon;
revoke all on function public.seller_cancel_offer(uuid, uuid, text, jsonb)
  from public, anon;
revoke all on function public.seller_discard_request_conversation(uuid, uuid, text, jsonb)
  from public, anon;
revoke all on function public.buyer_cancel_purchase(uuid, uuid, text, jsonb)
  from public, anon;
revoke all on function public.buyer_report_not_received(uuid, uuid, text, jsonb)
  from public, anon;
revoke all on function public.submit_conversation_rating(uuid, uuid, text, jsonb)
  from public, anon;
revoke all on function public.get_conversation_view(uuid, uuid)
  from public, anon;
revoke all on function public.get_conversation_timeline(uuid)
  from public, anon;
revoke all on function public.seller_finalize_transaction(uuid, uuid, text, jsonb)
  from public, anon;

grant execute on function public.buyer_accept_offer(uuid, uuid, text, jsonb)
  to authenticated, service_role;
grant execute on function public.buyer_confirm_received(uuid, uuid, text, jsonb)
  to authenticated, service_role;
grant execute on function public.seller_concretar_request(uuid, uuid, text, jsonb)
  to authenticated, service_role;
grant execute on function public.buyer_reject_offer(uuid, uuid, text, jsonb)
  to authenticated, service_role;
grant execute on function public.seller_cancel_offer(uuid, uuid, text, jsonb)
  to authenticated, service_role;
grant execute on function public.seller_discard_request_conversation(uuid, uuid, text, jsonb)
  to authenticated, service_role;
grant execute on function public.buyer_cancel_purchase(uuid, uuid, text, jsonb)
  to authenticated, service_role;
grant execute on function public.buyer_report_not_received(uuid, uuid, text, jsonb)
  to authenticated, service_role;
grant execute on function public.submit_conversation_rating(uuid, uuid, text, jsonb)
  to authenticated, service_role;
grant execute on function public.get_conversation_view(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.get_conversation_timeline(uuid)
  to authenticated, service_role;
grant execute on function public.seller_finalize_transaction(uuid, uuid, text, jsonb)
  to authenticated, service_role;

revoke all on function public.cleanup_empty_request_opened_conversations()
  from public, anon, authenticated;
revoke all on function public.process_expired_conversation_deadlines()
  from public, anon, authenticated;
grant execute on function public.cleanup_empty_request_opened_conversations()
  to service_role;
grant execute on function public.process_expired_conversation_deadlines()
  to service_role;

drop policy if exists "Enable read access for auth" on public.conversation;
create policy conversation_select_participant
on public.conversation
for select
to authenticated
using (
  exists (
    select 1
    from public.profile p
    where p.user_id = (select auth.uid())
      and p.id in (buyer_profile_id, seller_profile_id)
  )
);

drop policy if exists "select for authenticated users"
  on public.conversation_message;
create policy conversation_message_select_participant
on public.conversation_message
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation c
    join public.profile p
      on p.id in (c.buyer_profile_id, c.seller_profile_id)
    where c.id = conversation_message.conversation_id
      and p.user_id = (select auth.uid())
      and (
        conversation_message.visible_to_role_id is null
        or exists (
          select 1
          from public.role visible_role
          where visible_role.id = conversation_message.visible_to_role_id
            and (
              (visible_role.role_code = 'BUYER'
               and p.id = c.buyer_profile_id)
              or
              (visible_role.role_code = 'SELLER'
               and p.id = c.seller_profile_id)
            )
        )
      )
  )
);

do $$
begin
  if exists (
    select 1
    from public.conversation_action a
    group by a.code
    having count(*) > 1
  ) then
    raise exception 'duplicate_conversation_action_code_after_repair';
  end if;

  if exists (
    select 1
    from public.conversation_transition t
    where coalesce(t.is_system_transition, false) = false
    group by t.from_status_code, t.action_id, t.actor_role_id
    having count(*) > 1
  ) then
    raise exception 'ambiguous_conversation_transition_after_repair';
  end if;

  if exists (
    select 1
    from public.conversation_status_role_action sra
    join public.conversation_action a on a.id = sra.action_id
    where a.executor_code is null
      and a.code in (
        'BUYER_CANCEL_PURCHASE_DELAYED',
        'BUYER_CANCEL_PURCHASE_DELAYED_MENU',
        'BUYER_NOT_RECEIVED',
        'BUYER_NOT_RECEIVED_MENU'
      )
  ) then
    raise exception 'visible_lifecycle_action_without_executor_after_repair';
  end if;
end;
$$;
