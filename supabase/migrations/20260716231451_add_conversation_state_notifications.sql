alter table public.notification
  add column title text,
  add column event_code text,
  add column conversation_id uuid,
  add column conversation_status_history_id uuid,
  add column dedupe_key text,
  add column payload jsonb not null default '{}'::jsonb;

alter table public.notification
  add constraint notification_title_check
    check (title is null or btrim(title) <> ''),
  add constraint notification_event_code_check
    check (event_code is null or btrim(event_code) <> ''),
  add constraint notification_dedupe_key_check
    check (dedupe_key is null or btrim(dedupe_key) <> ''),
  add constraint notification_payload_object_check
    check (jsonb_typeof(payload) = 'object'),
  add constraint notification_conversation_id_fkey
    foreign key (conversation_id)
    references public.conversation(id)
    on delete set null,
  add constraint notification_conversation_status_history_id_fkey
    foreign key (conversation_status_history_id)
    references public.conversation_status_history(id)
    on delete set null,
  add constraint notification_dedupe_key_key
    unique (dedupe_key);

create index notification_conversation_created_at_idx
  on public.notification (conversation_id, created_at desc)
  where conversation_id is not null;

create index notification_conversation_status_history_idx
  on public.notification (conversation_status_history_id)
  where conversation_status_history_id is not null;

insert into public.notification_type_catalog (
  code,
  label,
  description,
  is_active,
  sort_order
)
values
  (
    'urgent',
    'Urgente',
    'Notificación urgente que requiere atención prioritaria.',
    true,
    10
  ),
  (
    'action_needed',
    'Acción requerida',
    'Notificación que requiere una acción del usuario.',
    true,
    20
  ),
  (
    'information',
    'Información',
    'Notificación informativa del sistema.',
    true,
    30
  )
on conflict (code) do nothing;

create or replace function private.create_profile_notification(
  p_profile_id uuid,
  p_type_code text,
  p_title text,
  p_message text,
  p_event_code text,
  p_conversation_id uuid,
  p_conversation_status_history_id uuid,
  p_dedupe_key text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification_id uuid;
  v_type_code text;
  v_title text;
  v_message text;
  v_event_code text;
  v_dedupe_key text;
begin
  v_type_code := regexp_replace(
    lower(btrim(coalesce(p_type_code, ''))),
    '[[:space:]]+',
    '_',
    'g'
  );
  v_title := nullif(btrim(coalesce(p_title, '')), '');
  v_message := btrim(coalesce(p_message, ''));
  v_event_code := nullif(btrim(coalesce(p_event_code, '')), '');
  v_dedupe_key := nullif(btrim(coalesce(p_dedupe_key, '')), '');

  if p_profile_id is null then
    raise exception 'profile_required';
  end if;

  if v_message = '' then
    raise exception 'notification_message_required';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'notification_payload_must_be_an_object';
  end if;

  if not exists (
    select 1
    from public.profile p
    where p.id = p_profile_id
  ) then
    raise exception 'profile_not_found';
  end if;

  if not exists (
    select 1
    from public.notification_type_catalog notification_type
    where notification_type.code = v_type_code
      and notification_type.is_active = true
  ) then
    raise exception 'invalid_notification_type';
  end if;

  insert into public.notification (
    type_code,
    title,
    message,
    event_code,
    conversation_id,
    conversation_status_history_id,
    dedupe_key,
    payload
  )
  values (
    v_type_code,
    v_title,
    v_message,
    v_event_code,
    p_conversation_id,
    p_conversation_status_history_id,
    v_dedupe_key,
    p_payload
  )
  on conflict (dedupe_key) do update
  set type_code = excluded.type_code,
      title = excluded.title,
      message = excluded.message,
      event_code = excluded.event_code,
      conversation_id = excluded.conversation_id,
      conversation_status_history_id = excluded.conversation_status_history_id,
      payload = excluded.payload
  returning id into v_notification_id;

  insert into public.profile_notification (notification_id, profile_id)
  values (v_notification_id, p_profile_id)
  on conflict (notification_id, profile_id) do nothing;

  return v_notification_id;
end;
$$;

create or replace function private.create_profile_notification(
  p_profile_id uuid,
  p_type_code text,
  p_message text
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.create_profile_notification(
    p_profile_id,
    p_type_code,
    null,
    p_message,
    null,
    null,
    null,
    null,
    '{}'::jsonb
  );
$$;

create or replace function private.create_conversation_status_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buyer_profile_id uuid;
  v_seller_profile_id uuid;
  v_purchase_request_id uuid;
  v_request_title text;
  v_to_status_text text;
  v_action_code text;
  v_canonical_action_code text;
  v_actor_label text;
  v_title text;
  v_message text;
  v_type_code text;
  v_target_profile_ids uuid[];
  v_target_profile_id uuid;
  v_dedupe_key text;
  v_payload jsonb;
begin
  if new.conversation_id is null or new.to_status_code is null then
    return new;
  end if;

  select
    conversation.buyer_profile_id,
    conversation.seller_profile_id,
    conversation.purchase_request_id,
    coalesce(
      nullif(btrim(purchase_request.title), ''),
      'tu solicitud'
    )
  into
    v_buyer_profile_id,
    v_seller_profile_id,
    v_purchase_request_id,
    v_request_title
  from public.conversation conversation
  left join public.purchase_request purchase_request
    on purchase_request.id = conversation.purchase_request_id
  where conversation.id = new.conversation_id;

  if not found then
    return new;
  end if;

  select upper(btrim(conversation_action.code))
  into v_action_code
  from public.conversation_action conversation_action
  where conversation_action.id = new.action_id;

  v_canonical_action_code := regexp_replace(
    coalesce(v_action_code, ''),
    '_MENU$',
    ''
  );

  if v_canonical_action_code = 'SELLER_FINALIZE'
     and new.to_status_code = 'SENT_SHIPMENT'
     and new.reason = 'otp_validated' then
    return new;
  end if;

  select coalesce(
    nullif(btrim(conversation_status.ui_text), ''),
    nullif(btrim(conversation_status.description), ''),
    new.to_status_code
  )
  into v_to_status_text
  from public.conversation_status conversation_status
  where conversation_status.code = new.to_status_code;

  v_to_status_text := coalesce(v_to_status_text, new.to_status_code);

  if v_canonical_action_code in (
    'SYSTEM_CLOSE_SIBLING_OFFER',
    'SYSTEM_CLOSE_SIBLING_REQUEST'
  ) then
    v_target_profile_ids := array[v_seller_profile_id]::uuid[];
  elsif new.actor_profile_id is null then
    v_target_profile_ids := array[
      v_buyer_profile_id,
      v_seller_profile_id
    ]::uuid[];
  else
    v_target_profile_ids := array[
      case
        when v_buyer_profile_id is distinct from new.actor_profile_id
          then v_buyer_profile_id
        else null
      end,
      case
        when v_seller_profile_id is distinct from new.actor_profile_id
          then v_seller_profile_id
        else null
      end
    ]::uuid[];
  end if;

  select array_agg(distinct target_profile_id)
  into v_target_profile_ids
  from unnest(v_target_profile_ids) target(target_profile_id)
  where target_profile_id is not null;

  if coalesce(cardinality(v_target_profile_ids), 0) = 0 then
    return new;
  end if;

  v_actor_label := case
    when new.actor_profile_id = v_buyer_profile_id then 'El comprador'
    when new.actor_profile_id = v_seller_profile_id then 'El vendedor'
    else 'El sistema'
  end;

  if new.reason = 'deadline_expired' then
    v_title := 'Tiempo vencido';
    v_message := format(
      'Venció el tiempo de esta etapa para «%s». Estado: %s.',
      v_request_title,
      v_to_status_text
    );
    v_type_code := 'urgent';
  else
    case v_canonical_action_code
      when 'SELLER_CREATE_OFFER' then
        v_title := 'Nueva oferta';
        v_message := format(
          'Recibiste una nueva oferta para «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'action_needed';
      when 'SELLER_MODIFY_OFFER' then
        v_title := 'Oferta actualizada';
        v_message := format(
          'El vendedor actualizó su oferta para «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'action_needed';
      when 'SELLER_CANCEL_OFFER' then
        v_title := 'Oferta retirada';
        v_message := format(
          'El vendedor retiró su oferta para «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      when 'SELLER_DISCARD_REQUEST' then
        v_title := 'Conversación cerrada';
        v_message := format(
          'El vendedor cerró la conversación sobre «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      when 'BUYER_ACCEPT_OFFER' then
        v_title := 'Oferta aceptada';
        v_message := format(
          'El comprador aceptó tu oferta para «%s». Confirma la disponibilidad para continuar. Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'action_needed';
      when 'BUYER_REJECT_OFFER' then
        v_title := 'Oferta rechazada';
        v_message := format(
          'El comprador rechazó tu oferta para «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      when 'SELLER_CONCRETAR' then
        v_title := 'Venta confirmada';
        v_message := format(
          'El vendedor confirmó la disponibilidad para «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      when 'BUYER_CANCEL_PURCHASE_OFFER_ACCEPTED' then
        v_title := 'Compra cancelada';
        v_message := format(
          'El comprador canceló la compra de «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      when 'BUYER_CANCEL_PURCHASE_DELAYED' then
        v_title := 'Compra cancelada';
        v_message := format(
          'El comprador canceló la compra de «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      when 'SELLER_FINALIZE' then
        v_title := 'Envío realizado';
        v_message := format(
          'El vendedor marcó como enviado el artículo de «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      when 'BUYER_CONFIRM_RECEIVED' then
        v_title := 'Entrega confirmada';
        v_message := format(
          'El comprador confirmó que recibió el artículo de «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      when 'BUYER_NOT_RECEIVED' then
        v_title := 'Entrega no recibida';
        v_message := format(
          'El comprador reportó que no recibió el artículo de «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'urgent';
      when 'BUYER_CANCEL_REQUEST' then
        v_title := 'Solicitud cancelada';
        v_message := format(
          'El comprador canceló la solicitud «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      when 'SYSTEM_CLOSE_SIBLING_OFFER' then
        v_title := 'Oferta no seleccionada';
        v_message := format(
          'El comprador seleccionó otra oferta para «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      when 'SYSTEM_CLOSE_SIBLING_REQUEST' then
        v_title := 'Conversación cerrada';
        v_message := format(
          'El comprador seleccionó otra oferta para «%s». Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      when 'SYSTEM_FINALIZE_PICKUP' then
        v_title := 'Entrega confirmada';
        v_message := format(
          'La entrega en tienda de «%s» fue confirmada. Estado: %s.',
          v_request_title,
          v_to_status_text
        );
        v_type_code := 'information';
      else
        if new.from_status_code is null
           and new.to_status_code = 'REQUEST_OPENED'
           and new.actor_profile_id = v_seller_profile_id then
          v_title := 'Conversación abierta';
          v_message := format(
            'Un vendedor abrió una conversación para «%s». Estado: %s.',
            v_request_title,
            v_to_status_text
          );
        else
          v_title := 'Conversación actualizada';
          v_message := format(
            '%s cambió el estado de «%s» a %s.',
            v_actor_label,
            v_request_title,
            v_to_status_text
          );
        end if;
        v_type_code := case
          when new.to_status_code in (
            'DELAYED_ACCEPTANCE',
            'DELAYED_SHIPMENT'
          ) then 'urgent'
          else 'information'
        end;
    end case;
  end if;

  foreach v_target_profile_id in array v_target_profile_ids
  loop
    v_dedupe_key := format(
      'conversation_status:%s:%s',
      new.id,
      v_target_profile_id
    );

    v_payload := jsonb_strip_nulls(jsonb_build_object(
      'event_code', 'conversation_status_changed',
      'conversation_id', case
        when v_canonical_action_code = 'SELLER_CANCEL_OFFER' then null
        else new.conversation_id
      end,
      'conversation_status_history_id', new.id,
      'purchase_request_id', v_purchase_request_id,
      'actor_profile_id', new.actor_profile_id,
      'action_code', nullif(v_action_code, ''),
      'from_status_code', new.from_status_code,
      'to_status_code', new.to_status_code,
      'navigation', case
        when v_canonical_action_code = 'SELLER_CANCEL_OFFER' then
          jsonb_build_object(
            'pathname', '/request/[purchaseRequestId]',
            'params', jsonb_build_object(
              'purchaseRequestId', v_purchase_request_id
            )
          )
        else
          jsonb_build_object(
            'pathname', '/(conversation)/offer',
            'params', jsonb_build_object(
              'conversationId', new.conversation_id
            )
          )
      end
    ));

    perform private.create_profile_notification(
      v_target_profile_id,
      v_type_code,
      v_title,
      v_message,
      'conversation_status_changed',
      case
        when v_canonical_action_code = 'SELLER_CANCEL_OFFER' then null
        else new.conversation_id
      end,
      new.id,
      v_dedupe_key,
      v_payload
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists create_conversation_status_notifications
  on public.conversation_status_history;

create trigger create_conversation_status_notifications
after insert on public.conversation_status_history
for each row
execute function private.create_conversation_status_notifications();

create or replace function private.create_purchase_offer_update_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation record;
  v_event_id uuid;
  v_message text;
  v_dedupe_key text;
  v_payload jsonb;
begin
  for v_conversation in
    select
      conversation.id as conversation_id,
      conversation.purchase_request_id,
      conversation.buyer_profile_id,
      conversation.seller_profile_id,
      coalesce(
        nullif(btrim(purchase_request.title), ''),
        'tu solicitud'
      ) as request_title
    from public.conversation conversation
    left join public.purchase_request purchase_request
      on purchase_request.id = conversation.purchase_request_id
    where conversation.purchase_offer_id = new.id
      and conversation.status_code = 'OFFER_MADE'
      and conversation.buyer_profile_id is not null
  loop
    v_event_id := gen_random_uuid();
    v_message := format(
      'El vendedor actualizó su oferta para «%s». Estado: Oferta enviada.',
      v_conversation.request_title
    );
    v_dedupe_key := format(
      'conversation_offer_updated:%s:%s',
      v_event_id,
      v_conversation.buyer_profile_id
    );
    v_payload := jsonb_build_object(
      'event_code', 'conversation_offer_updated',
      'event_id', v_event_id,
      'conversation_id', v_conversation.conversation_id,
      'purchase_request_id', v_conversation.purchase_request_id,
      'actor_profile_id', v_conversation.seller_profile_id,
      'action_code', 'SELLER_MODIFY_OFFER',
      'from_status_code', 'OFFER_MADE',
      'to_status_code', 'OFFER_MADE',
      'navigation', jsonb_build_object(
        'pathname', '/(conversation)/offer',
        'params', jsonb_build_object(
          'conversationId', v_conversation.conversation_id
        )
      )
    );

    perform private.create_profile_notification(
      v_conversation.buyer_profile_id,
      'action_needed',
      'Oferta actualizada',
      v_message,
      'conversation_offer_updated',
      v_conversation.conversation_id,
      null,
      v_dedupe_key,
      v_payload
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists create_purchase_offer_update_notification
  on public.purchase_offer;

create trigger create_purchase_offer_update_notification
after update of description, price, currency_id on public.purchase_offer
for each row
execute function private.create_purchase_offer_update_notification();

revoke all on function private.create_profile_notification(uuid, text, text)
  from public, anon, authenticated;

revoke all on function private.create_profile_notification(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  jsonb
)
  from public, anon, authenticated;

revoke all on function private.create_conversation_status_notifications()
  from public, anon, authenticated;

revoke all on function private.create_purchase_offer_update_notification()
  from public, anon, authenticated;
