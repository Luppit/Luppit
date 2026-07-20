alter table public.conversation_status
  add column if not exists ui_text text,
  add column if not exists style_code text,
  add column if not exists sort_order integer;

update public.conversation_status as status
set
  ui_text = presentation.ui_text,
  style_code = presentation.style_code,
  sort_order = presentation.sort_order
from (
  values
    ('REQUEST_OPENED', 'Solicitud abierta', 'info', 10),
    ('OFFER_MADE', 'Oferta enviada', 'info', 20),
    ('OFFER_ACCEPTED', 'Oferta aceptada', 'primary', 30),
    ('SELLER_ACCEPTED', 'Venta confirmada', 'primary', 40),
    ('SENT_SHIPMENT', 'Envío realizado', 'info', 50),
    ('DELAYED_ACCEPTANCE', 'Confirmación atrasada', 'error', 60),
    ('DELAYED_SHIPMENT', 'Entrega atrasada', 'error', 70),
    ('FINALIZED', 'Finalizada', 'success', 80),
    ('OFFER_REJECTED', 'Oferta rechazada', 'error', 90),
    ('REQUEST_DISCARDED', 'Solicitud descartada', 'error', 100),
    ('REQUEST_CANCELED', 'Solicitud cancelada', 'error', 110)
) as presentation(status_code, ui_text, style_code, sort_order)
where status.code = presentation.status_code;

drop function if exists public.get_current_seller_purchase_offers(
  uuid,
  text,
  date,
  date,
  uuid[],
  uuid[],
  text
);

create function public.get_current_seller_purchase_offers(
  p_profile_id uuid,
  p_search_text text default null::text,
  p_start_date date default null::date,
  p_end_date date default null::date,
  p_category_ids uuid[] default null::uuid[],
  p_currency_ids uuid[] default null::uuid[],
  p_sort_code text default 'newly_listed'::text,
  p_conversation_status_codes text[] default null::text[]
)
returns table(
  id uuid,
  created_at timestamp with time zone,
  business_id uuid,
  currency_id uuid,
  description text,
  price numeric,
  purchase_request_id uuid,
  request_title text,
  request_category_id uuid,
  request_category_name text,
  request_profile_name text,
  offer_currency_code text,
  conversation_id uuid,
  conversation_status_code text,
  conversation_status_label text,
  conversation_status_style_code text,
  conversation_status_sort_order integer,
  conversation_is_terminal boolean
)
language sql
stable
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
  with authorized_profile as (
    select profile.id
    from public.profile as profile
    where profile.id = p_profile_id
      and profile.user_id = auth.uid()
  ),
  seller_business as (
    select profile_business.business_id
    from public.profile_business as profile_business
    join authorized_profile
      on authorized_profile.id = profile_business.profile_id
    order by profile_business.created_at desc
    limit 1
  ),
  seller_offers as (
    select
      purchase_offer.id,
      purchase_offer.created_at,
      purchase_offer.business_id,
      purchase_offer.currency_id,
      purchase_offer.description,
      purchase_offer.price,
      coalesce(
        purchase_offer.purchase_request_id,
        conversation.purchase_request_id
      ) as purchase_request_id,
      coalesce(
        case
          when lower(trim(purchase_request.title)) <> 'solicitud'
            then nullif(trim(purchase_request.title), '')
        end,
        case
          when lower(trim(purchase_request.contract ->> 'titulo')) <> 'solicitud'
            then nullif(trim(purchase_request.contract ->> 'titulo'), '')
        end,
        case
          when lower(trim(purchase_request.contract -> 'resumen' ->> 'titulo')) <> 'solicitud'
            then nullif(trim(purchase_request.contract -> 'resumen' ->> 'titulo'), '')
        end,
        nullif(trim(purchase_request.summary_text), '')
      ) as request_title,
      purchase_request.category_id as request_category_id,
      purchase_request.category_name as request_category_name,
      buyer_profile.name as request_profile_name,
      currency.currency_code as offer_currency_code,
      conversation.id as conversation_id,
      conversation.status_code as conversation_status_code,
      coalesce(
        conversation_status.ui_text,
        conversation_status.description,
        conversation.status_code
      ) as conversation_status_label,
      conversation_status.style_code as conversation_status_style_code,
      conversation_status.sort_order as conversation_status_sort_order,
      conversation_status.is_terminal as conversation_is_terminal
    from public.purchase_offer as purchase_offer
    join seller_business
      on seller_business.business_id = purchase_offer.business_id
    left join public.conversation as conversation
      on conversation.purchase_offer_id = purchase_offer.id
    left join public.conversation_status as conversation_status
      on conversation_status.code = conversation.status_code
    left join public.purchase_request as purchase_request
      on purchase_request.id = coalesce(
        purchase_offer.purchase_request_id,
        conversation.purchase_request_id
      )
    left join public.profile as buyer_profile
      on buyer_profile.id = purchase_request.profile_id
    left join public.currency as currency
      on currency.id = purchase_offer.currency_id
    where (
        nullif(trim(p_search_text), '') is null
        or purchase_offer.description ilike '%' || trim(p_search_text) || '%'
        or coalesce(
          case
            when lower(trim(purchase_request.title)) <> 'solicitud'
              then nullif(trim(purchase_request.title), '')
          end,
          case
            when lower(trim(purchase_request.contract ->> 'titulo')) <> 'solicitud'
              then nullif(trim(purchase_request.contract ->> 'titulo'), '')
          end,
          case
            when lower(trim(purchase_request.contract -> 'resumen' ->> 'titulo')) <> 'solicitud'
              then nullif(trim(purchase_request.contract -> 'resumen' ->> 'titulo'), '')
          end,
          nullif(trim(purchase_request.summary_text), '')
        ) ilike '%' || trim(p_search_text) || '%'
        or purchase_request.category_name ilike '%' || trim(p_search_text) || '%'
        or buyer_profile.name ilike '%' || trim(p_search_text) || '%'
        or currency.currency_code ilike '%' || trim(p_search_text) || '%'
        or coalesce(
          conversation_status.ui_text,
          conversation_status.description,
          conversation.status_code
        ) ilike '%' || trim(p_search_text) || '%'
      )
      and (p_start_date is null or purchase_offer.created_at::date >= p_start_date)
      and (p_end_date is null or purchase_offer.created_at::date <= p_end_date)
      and (
        p_category_ids is null
        or cardinality(p_category_ids) = 0
        or purchase_request.category_id = any(p_category_ids)
      )
      and (
        p_currency_ids is null
        or cardinality(p_currency_ids) = 0
        or purchase_offer.currency_id = any(p_currency_ids)
      )
      and (
        p_conversation_status_codes is null
        or cardinality(p_conversation_status_codes) = 0
        or conversation.status_code = any(p_conversation_status_codes)
      )
  )
  select *
  from seller_offers
  order by
    case
      when p_sort_code in ('newly_listed', 'offer_created_newest')
        then created_at
    end desc nulls last,
    case
      when p_sort_code = 'offer_created_oldest'
        then created_at
    end asc nulls last,
    case
      when p_sort_code in ('price_col_low_to_high', 'price_col_high_to_low')
        then case when lower(offer_currency_code) in ('col', 'crc') then 0 else 1 end
      when p_sort_code in ('price_usd_low_to_high', 'price_usd_high_to_low')
        then case when lower(offer_currency_code) = 'usd' then 0 else 1 end
    end asc nulls last,
    case
      when p_sort_code = 'price_col_low_to_high'
        and lower(offer_currency_code) in ('col', 'crc')
        then price
    end asc nulls last,
    case
      when p_sort_code = 'price_col_high_to_low'
        and lower(offer_currency_code) in ('col', 'crc')
        then price
    end desc nulls last,
    case
      when p_sort_code = 'price_usd_low_to_high'
        and lower(offer_currency_code) = 'usd'
        then price
    end asc nulls last,
    case
      when p_sort_code = 'price_usd_high_to_low'
        and lower(offer_currency_code) = 'usd'
        then price
    end desc nulls last,
    created_at desc nulls last;
$function$;

revoke all on function public.get_current_seller_purchase_offers(
  uuid,
  text,
  date,
  date,
  uuid[],
  uuid[],
  text,
  text[]
) from public, anon;

grant execute on function public.get_current_seller_purchase_offers(
  uuid,
  text,
  date,
  date,
  uuid[],
  uuid[],
  text,
  text[]
) to authenticated, service_role;

notify pgrst, 'reload schema';
