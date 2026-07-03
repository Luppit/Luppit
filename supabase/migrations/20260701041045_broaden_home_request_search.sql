create or replace function private.get_buyer_marketplace_hub_rows(
  p_profile_id uuid,
  p_search_text text default null::text,
  p_start_date date default null::date,
  p_end_date date default null::date,
  p_status_codes text[] default null::text[],
  p_segment_svg_name text default null::text
)
returns table(
  purchase_request_id uuid,
  stage_code text,
  ranking_score numeric,
  event_at timestamptz,
  unread_conversation_count integer,
  unread_message_count integer,
  item jsonb
)
language sql
stable
set search_path to 'pg_catalog', 'public', 'private'
as $function$
with buyer_role as (
  select r.id
  from public.role r
  where lower(coalesce(r.role_code, r.name)) = 'buyer'
  order by r.created_at
  limit 1
),
base_requests as (
  select
    pr.*,
    psui.ui_text as status_label,
    psui.style_code as status_style_code
  from public.purchase_request pr
  join public.purchase_request_status prs
    on prs.code = pr.status
   and prs.is_buyer_home_visible = true
  left join public.purchase_request_status_ui psui
    on psui.status_code = pr.status
  left join public.category cat
    on cat.id = pr.category_id
  left join public.segment seg
    on seg.id = cat.segment_id
  where pr.profile_id = p_profile_id
    and (
      nullif(trim(p_search_text), '') is null
      or concat_ws(
        ' ',
        pr.title,
        pr.summary_text,
        pr.category_name,
        pr.category_path,
        psui.ui_text,
        pr.status,
        pr.id::text
      ) ilike '%' || trim(p_search_text) || '%'
    )
    and (
      p_start_date is null
      or coalesce(pr.published_at, pr.created_at)::date >= p_start_date
    )
    and (
      p_end_date is null
      or coalesce(pr.published_at, pr.created_at)::date <= p_end_date
    )
    and (
      p_status_codes is null
      or cardinality(p_status_codes) = 0
      or pr.status = any(p_status_codes)
    )
    and (
      nullif(trim(p_segment_svg_name), '') is null
      or lower(trim(p_segment_svg_name)) = 'todas'
      or seg.svg_name = trim(p_segment_svg_name)
    )
),
visualization_counts as (
  select prv.purchase_request_id, count(distinct prv.profile_id)::integer as views_count
  from public.purchase_request_visualization prv
  group by prv.purchase_request_id
),
conversation_signals as (
  select
    c.purchase_request_id,
    count(distinct c.purchase_offer_id) filter (
      where c.purchase_offer_id is not null
        and coalesce(cs.is_terminal, false) = false
    )::integer as offers_count,
    count(distinct c.id) filter (
      where coalesce(unread.unread_count, 0) > 0
    )::integer as unread_conversation_count,
    coalesce(sum(unread.unread_count), 0)::integer as unread_message_count,
    max(coalesce(unread.last_message_at, c.created_at)) as last_activity_at
  from public.conversation c
  left join public.conversation_status cs
    on cs.code = c.status_code
  left join lateral (
    select
      count(*) filter (
        where cm.buyer_open_state = 'unopened'
          and cm.sender_profile_id is distinct from p_profile_id
      )::integer as unread_count,
      max(cm.created_at) as last_message_at
    from public.conversation_message cm
    where cm.conversation_id = c.id
  ) unread on true
  where c.buyer_profile_id = p_profile_id
    and c.purchase_request_id is not null
  group by c.purchase_request_id
),
deadline_candidates as (
  select distinct on (c.purchase_request_id)
    c.purchase_request_id,
    c.id as conversation_id,
    c.purchase_offer_id,
    c.status_code,
    cd.due_at,
    cd.due_at < now() as is_overdue
  from public.conversation c
  join public.conversation_deadline cd
    on cd.id = c.id
   and cd.resolved_at is null
   and cd.due_at is not null
  where c.buyer_profile_id = p_profile_id
    and c.purchase_request_id is not null
  order by c.purchase_request_id, (cd.due_at < now()) desc, cd.due_at asc
),
action_candidates as (
  select distinct on (c.purchase_request_id)
    c.purchase_request_id,
    c.id as conversation_id,
    c.purchase_offer_id,
    c.status_code,
    ca.code as action_code,
    ca.label as action_label,
    ca.icon as action_icon,
    ca.style_code as action_style_code,
    ca.ui_slot,
    cae.execution_type,
    cae.target,
    hrr.stage_code,
    hr.code as reason_code,
    hr.label as reason_label,
    hr.description as reason_detail,
    hrr.priority
  from public.conversation c
  join public.conversation_status_role_action csra
    on csra.status_code = c.status_code
   and coalesce(csra.is_enabled, true) = true
  join buyer_role br
    on br.id = csra.role_id
  join public.conversation_action ca
    on ca.id = csra.action_id
   and ca.code is distinct from 'BUYER_ACCEPT_OFFER'
  left join public.conversation_action_executor cae
    on cae.code = ca.executor_code
  join public.home_hub_reason_rule hrr
    on hrr.role_code = 'buyer'
   and hrr.is_active = true
   and (hrr.conversation_status_code is null or hrr.conversation_status_code = c.status_code)
   and hrr.action_code = ca.code
  join public.home_hub_reason hr
    on hr.code = hrr.reason_code
   and hr.is_active = true
  where c.buyer_profile_id = p_profile_id
    and c.purchase_request_id is not null
  order by c.purchase_request_id, hrr.priority, csra.sort_order, c.created_at desc
),
status_candidates as (
  select distinct on (c.purchase_request_id)
    c.purchase_request_id,
    c.id as conversation_id,
    c.purchase_offer_id,
    c.status_code,
    hrr.stage_code,
    hr.code as reason_code,
    hr.label as reason_label,
    hr.description as reason_detail,
    hrr.priority
  from public.conversation c
  join public.home_hub_reason_rule hrr
    on hrr.role_code = 'buyer'
   and hrr.is_active = true
   and hrr.action_code is null
   and hrr.conversation_status_code = c.status_code
  join public.home_hub_reason hr
    on hr.code = hrr.reason_code
   and hr.is_active = true
  where c.buyer_profile_id = p_profile_id
    and c.purchase_request_id is not null
  order by c.purchase_request_id, hrr.priority, c.created_at desc
),
resolved as (
  select
    br.*,
    coalesce(vc.views_count, 0) as views_count,
    coalesce(cs.offers_count, 0) as offers_count,
    coalesce(cs.unread_conversation_count, 0) as unread_conversation_count,
    coalesce(cs.unread_message_count, 0) as unread_message_count,
    coalesce(cs.last_activity_at, br.published_at, br.created_at) as event_at,
    dc.conversation_id as deadline_conversation_id,
    dc.purchase_offer_id as deadline_purchase_offer_id,
    dc.due_at,
    coalesce(dc.is_overdue, false) as is_overdue,
    ac.conversation_id as action_conversation_id,
    ac.purchase_offer_id as action_purchase_offer_id,
    ac.status_code as action_status_code,
    ac.action_code,
    ac.action_label,
    ac.action_icon,
    ac.action_style_code,
    ac.ui_slot,
    ac.execution_type,
    ac.target,
    ac.stage_code as action_stage_code,
    ac.reason_code,
    ac.reason_label,
    ac.reason_detail,
    ac.priority as action_priority,
    sc.conversation_id as status_conversation_id,
    sc.purchase_offer_id as status_purchase_offer_id,
    sc.stage_code as status_stage_code,
    sc.reason_code as status_reason_code,
    sc.reason_label as status_reason_label,
    sc.reason_detail as status_reason_detail
  from base_requests br
  left join visualization_counts vc
    on vc.purchase_request_id = br.id
  left join conversation_signals cs
    on cs.purchase_request_id = br.id
  left join deadline_candidates dc
    on dc.purchase_request_id = br.id
  left join action_candidates ac
    on ac.purchase_request_id = br.id
  left join status_candidates sc
    on sc.purchase_request_id = br.id
),
classified as (
  select
    r.*,
    case
      when r.status_stage_code = 'in_progress' and (r.is_overdue or r.action_code is not null)
        then 'needs_attention'
      when r.unread_message_count > 0
        then 'needs_attention'
      when r.status_stage_code = 'in_progress'
        then 'in_progress'
      when r.offers_count > 0
        then 'offers_received'
      else 'waiting_offers'
    end as resolved_stage_code,
    case
      when r.status_stage_code = 'in_progress' and r.is_overdue
        then 'buyer_deadline_overdue'
      when r.status_stage_code = 'in_progress' and r.action_code is not null
        then r.reason_code
      when r.unread_message_count > 0
        then 'buyer_unread_message'
      when r.status_stage_code = 'in_progress'
        then coalesce(r.status_reason_code, 'buyer_in_progress')
      when r.offers_count > 0
        then 'buyer_offers_received'
      else 'buyer_waiting_offers'
    end as resolved_reason_code,
    case
      when r.status_stage_code = 'in_progress' and r.is_overdue
        then 'Hay un plazo vencido'
      when r.status_stage_code = 'in_progress' and r.action_code is not null
        then r.reason_label
      when r.unread_message_count > 0
        then 'Tienes un mensaje sin leer'
      when r.status_stage_code = 'in_progress'
        then coalesce(r.status_reason_label, 'Compra en proceso')
      when r.offers_count = 1
        then '1 oferta para revisar'
      when r.offers_count > 1
        then r.offers_count::text || ' ofertas para comparar'
      else 'Esperando ofertas'
    end as resolved_reason_label,
    case
      when r.status_stage_code = 'in_progress' and r.is_overdue then 1000000
      when r.status_stage_code = 'in_progress' and r.action_code is not null then 900000
      when r.unread_message_count > 0 then 850000
      when r.offers_count > 0 then 700000 + least(r.offers_count, 99) * 100
      when r.status_stage_code = 'in_progress' then 600000
      else 300000
    end
    + extract(epoch from coalesce(r.event_at, r.created_at)) / 1000000000.0
      as resolved_ranking_score
  from resolved r
)
select
  c.id,
  c.resolved_stage_code,
  c.resolved_ranking_score,
  c.event_at,
  c.unread_conversation_count,
  c.unread_message_count,
  jsonb_build_object(
    'hub_item_id', c.id,
    'entity_type', 'purchase_request',
    'purchase_request_id', c.id,
    'id', c.id,
    'title', c.title,
    'summary_text', c.summary_text,
    'category_id', c.category_id,
    'category_name', c.category_name,
    'category_path', c.category_path,
    'status', c.status,
    'status_label', c.status_label,
    'status_style_code', c.status_style_code,
    'published_at', c.published_at,
    'created_at', c.created_at,
    'conversation_id', coalesce(c.deadline_conversation_id, c.action_conversation_id, c.status_conversation_id),
    'purchase_offer_id', coalesce(c.deadline_purchase_offer_id, c.action_purchase_offer_id, c.status_purchase_offer_id),
    'event_at', c.event_at,
    'views_count', c.views_count,
    'offers_count', c.offers_count,
    'unread_count', c.unread_message_count,
    'has_unopened', c.unread_message_count > 0,
    'due_at', c.due_at,
    'is_overdue', c.is_overdue,
    'priority', jsonb_build_object(
      'code', c.resolved_stage_code,
      'label', null,
      'style_code', null,
      'rank', floor(c.resolved_ranking_score)::integer
    ),
    'reason', jsonb_build_object(
      'code', c.resolved_reason_code,
      'label', c.resolved_reason_label,
      'detail', null
    ),
    'action', case
      when c.action_code is null then null
      else jsonb_build_object(
        'code', c.action_code,
        'label', c.action_label,
        'icon', c.action_icon,
        'style_code', c.action_style_code,
        'ui_slot', c.ui_slot,
        'execution_type', c.execution_type,
        'target', c.target
      )
    end,
    'navigation', jsonb_build_object(
      'target', 'purchase_request',
      'purchase_request_id', c.id,
      'conversation_id', null
    ),
    'ranking_score', floor(c.resolved_ranking_score)::integer
  )
from classified c;
$function$;

create or replace function private.get_seller_marketplace_hub_rows(
  p_profile_id uuid,
  p_search_text text default null::text,
  p_start_date date default null::date,
  p_end_date date default null::date,
  p_category_ids uuid[] default null::uuid[],
  p_seller_interaction_states text[] default null::text[],
  p_segment_svg_name text default null::text
)
returns table(
  purchase_request_id uuid,
  stage_code text,
  ranking_score numeric,
  event_at timestamptz,
  unread_conversation_count integer,
  unread_message_count integer,
  item jsonb
)
language sql
stable
set search_path to 'pg_catalog', 'public', 'private'
as $function$
with seller_context as (
  select pb.business_id
  from public.profile_business pb
  where pb.profile_id = p_profile_id
    and pb.business_id is not null
  order by pb.created_at
  limit 1
),
seller_role as (
  select r.id
  from public.role r
  where lower(coalesce(r.role_code, r.name)) = 'seller'
  order by r.created_at
  limit 1
),
settings as (
  select
    coalesce((
      select (hhs.rule_config ->> 'max_active_offers')::integer
      from public.home_hub_section hhs
      where hhs.role_code = 'seller'
        and hhs.code = 'low_competition'
    ), 2) as max_active_offers,
    coalesce((
      select (hhs.rule_config ->> 'freshness_days')::integer
      from public.home_hub_section hhs
      where hhs.role_code = 'seller'
        and hhs.code = 'new'
    ), 3) as freshness_days
),
eligible_requests as (
  select
    pr.*,
    psui.ui_text as status_label,
    psui.style_code as status_style_code
  from seller_context seller
  join public.business_category_preference bcp
    on bcp.business_id = seller.business_id
  join public.purchase_request pr
    on pr.category_id = bcp.category_id
  join public.purchase_request_status prs
    on prs.code = pr.status
   and prs.is_seller_home_visible = true
  left join public.purchase_request_status_ui psui
    on psui.status_code = pr.status
  left join public.category cat
    on cat.id = pr.category_id
  left join public.segment seg
    on seg.id = cat.segment_id
  where (
      nullif(trim(p_search_text), '') is null
      or concat_ws(
        ' ',
        pr.title,
        pr.summary_text,
        pr.category_name,
        pr.category_path,
        psui.ui_text,
        pr.status,
        pr.id::text
      ) ilike '%' || trim(p_search_text) || '%'
    )
    and (
      p_start_date is null
      or coalesce(pr.published_at, pr.created_at)::date >= p_start_date
    )
    and (
      p_end_date is null
      or coalesce(pr.published_at, pr.created_at)::date <= p_end_date
    )
    and (
      p_category_ids is null
      or cardinality(p_category_ids) = 0
      or pr.category_id = any(p_category_ids)
    )
    and (
      nullif(trim(p_segment_svg_name), '') is null
      or lower(trim(p_segment_svg_name)) = 'todas'
      or seg.svg_name = trim(p_segment_svg_name)
    )
),
visualization_counts as (
  select prv.purchase_request_id, count(distinct prv.profile_id)::integer as views_count
  from public.purchase_request_visualization prv
  group by prv.purchase_request_id
),
seller_seen_requests as (
  select distinct prv.purchase_request_id
  from public.purchase_request_visualization prv
  where prv.profile_id = p_profile_id
),
competition_counts as (
  select
    c.purchase_request_id,
    count(distinct c.purchase_offer_id) filter (
      where c.purchase_offer_id is not null
        and coalesce(cs.is_terminal, false) = false
        and coalesce(c.status_code, '') not in ('REQUEST_DISCARDED', 'OFFER_REJECTED')
    )::integer as offers_count
  from public.conversation c
  left join public.conversation_status cs
    on cs.code = c.status_code
  where c.purchase_request_id is not null
  group by c.purchase_request_id
),
seller_conversations as (
  select distinct on (c.purchase_request_id)
    c.purchase_request_id,
    c.id as conversation_id,
    c.purchase_offer_id,
    c.status_code,
    c.created_at,
    coalesce(cs.is_terminal, false) as is_terminal,
    coalesce(unread.unread_count, 0) as unread_count,
    unread.last_message_at
  from public.conversation c
  left join public.conversation_status cs
    on cs.code = c.status_code
  left join lateral (
    select
      count(*) filter (
        where cm.seller_open_state = 'unopened'
          and cm.sender_profile_id is distinct from p_profile_id
      )::integer as unread_count,
      max(cm.created_at) as last_message_at
    from public.conversation_message cm
    where cm.conversation_id = c.id
  ) unread on true
  where c.seller_profile_id = p_profile_id
    and c.purchase_request_id is not null
  order by c.purchase_request_id, c.created_at desc
),
deadline_candidates as (
  select
    c.purchase_request_id,
    c.id as conversation_id,
    c.purchase_offer_id,
    cd.due_at,
    cd.due_at < now() as is_overdue
  from public.conversation c
  join public.conversation_deadline cd
    on cd.id = c.id
   and cd.resolved_at is null
   and cd.due_at is not null
  where c.seller_profile_id = p_profile_id
),
action_candidates as (
  select distinct on (c.purchase_request_id)
    c.purchase_request_id,
    c.id as conversation_id,
    c.purchase_offer_id,
    ca.code as action_code,
    ca.label as action_label,
    ca.icon as action_icon,
    ca.style_code as action_style_code,
    ca.ui_slot,
    cae.execution_type,
    cae.target,
    hr.code as reason_code,
    hr.label as reason_label,
    hr.description as reason_detail,
    hrr.priority
  from public.conversation c
  join public.conversation_status_role_action csra
    on csra.status_code = c.status_code
   and coalesce(csra.is_enabled, true) = true
  join seller_role sr
    on sr.id = csra.role_id
  join public.conversation_action ca
    on ca.id = csra.action_id
  left join public.conversation_action_executor cae
    on cae.code = ca.executor_code
  join public.home_hub_reason_rule hrr
    on hrr.role_code = 'seller'
   and hrr.is_active = true
   and (hrr.conversation_status_code is null or hrr.conversation_status_code = c.status_code)
   and hrr.action_code = ca.code
  join public.home_hub_reason hr
    on hr.code = hrr.reason_code
   and hr.is_active = true
  where c.seller_profile_id = p_profile_id
    and c.purchase_request_id is not null
  order by c.purchase_request_id, hrr.priority, csra.sort_order, c.created_at desc
),
resolved as (
  select
    er.*,
    coalesce(vc.views_count, 0) as views_count,
    coalesce(cc.offers_count, 0) as offers_count,
    sc.conversation_id,
    sc.purchase_offer_id,
    sc.status_code as conversation_status_code,
    sc.is_terminal as conversation_is_terminal,
    sc.unread_count,
    coalesce(sc.last_message_at, sc.created_at, er.published_at, er.created_at) as event_at,
    dc.due_at,
    coalesce(dc.is_overdue, false) as is_overdue,
    ac.action_code,
    ac.action_label,
    ac.action_icon,
    ac.action_style_code,
    ac.ui_slot,
    ac.execution_type,
    ac.target,
    ac.reason_code,
    ac.reason_label,
    settings.max_active_offers,
    settings.freshness_days
  from eligible_requests er
  cross join settings
  left join visualization_counts vc
    on vc.purchase_request_id = er.id
  left join competition_counts cc
    on cc.purchase_request_id = er.id
  left join seller_conversations sc
    on sc.purchase_request_id = er.id
  left join deadline_candidates dc
    on dc.purchase_request_id = er.id
  left join action_candidates ac
    on ac.purchase_request_id = er.id
  left join seller_seen_requests ssr
    on ssr.purchase_request_id = er.id
  where coalesce(sc.is_terminal, false) = false
    and coalesce(sc.status_code, '') not in ('REQUEST_DISCARDED', 'OFFER_REJECTED')
    and not (
      sc.conversation_id is null
      and ssr.purchase_request_id is not null
    )
    and (
      p_seller_interaction_states is null
      or cardinality(p_seller_interaction_states) = 0
      or ('new' = any(p_seller_interaction_states) and sc.conversation_id is null)
      or ('opened' = any(p_seller_interaction_states) and sc.conversation_id is not null)
    )
),
classified as (
  select
    r.*,
    case
      when r.purchase_offer_id is not null
       and (
         r.is_overdue
         or r.due_at <= now() + interval '24 hours'
         or r.action_code is not null
         or r.unread_count > 0
       )
        then 'needs_attention'
      when r.purchase_offer_id is not null
        then 'negotiating'
      when r.offers_count <= r.max_active_offers
        then 'low_competition'
      when coalesce(r.published_at, r.created_at) >= now() - make_interval(days => r.freshness_days)
        then 'new'
      else 'matching'
    end as resolved_stage_code,
    case
      when r.purchase_offer_id is not null and r.is_overdue then 'seller_deadline_overdue'
      when r.purchase_offer_id is not null and r.action_code is not null then r.reason_code
      when r.purchase_offer_id is not null
       and r.due_at <= now() + interval '24 hours'
        then 'seller_deadline_soon'
      when r.purchase_offer_id is not null and r.unread_count > 0 then 'seller_unread_message'
      when r.purchase_offer_id is not null then 'seller_negotiating'
      when r.offers_count <= r.max_active_offers then 'seller_low_competition'
      when coalesce(r.published_at, r.created_at) >= now() - make_interval(days => r.freshness_days)
        then 'seller_new_opportunity'
      else 'seller_matching'
    end as resolved_reason_code,
    case
      when r.purchase_offer_id is not null and r.is_overdue then 'Hay un plazo vencido'
      when r.purchase_offer_id is not null and r.action_code is not null then r.reason_label
      when r.purchase_offer_id is not null
       and r.due_at <= now() + interval '24 hours'
        then 'Tienes un plazo próximo'
      when r.purchase_offer_id is not null and r.unread_count > 0 then 'Tienes un mensaje sin leer'
      when r.purchase_offer_id is not null then 'Negociación en curso'
      when r.offers_count <= r.max_active_offers then 'Poca competencia'
      when coalesce(r.published_at, r.created_at) >= now() - make_interval(days => r.freshness_days)
        then 'Nueva oportunidad'
      else 'Coincide con tus categorías'
    end as resolved_reason_label,
    case
      when r.purchase_offer_id is not null and r.is_overdue then 1000000
      when r.purchase_offer_id is not null and r.action_code is not null then 950000
      when r.purchase_offer_id is not null
       and r.due_at <= now() + interval '24 hours'
        then 925000
      when r.purchase_offer_id is not null and r.unread_count > 0 then 900000
      when r.purchase_offer_id is not null then 800000
      when r.offers_count <= r.max_active_offers then 650000 - least(r.offers_count, 99) * 1000
      when coalesce(r.published_at, r.created_at) >= now() - make_interval(days => r.freshness_days)
        then 500000
      else 300000
    end
    + extract(epoch from coalesce(r.event_at, r.created_at)) / 1000000000.0
      + least(r.views_count, 999) / 100000.0
      as resolved_ranking_score
  from resolved r
)
select
  c.id,
  c.resolved_stage_code,
  c.resolved_ranking_score,
  c.event_at,
  case when c.unread_count > 0 then 1 else 0 end,
  c.unread_count,
  jsonb_build_object(
    'hub_item_id', c.id,
    'entity_type', 'purchase_request',
    'purchase_request_id', c.id,
    'id', c.id,
    'title', c.title,
    'summary_text', c.summary_text,
    'category_id', c.category_id,
    'category_name', c.category_name,
    'category_path', c.category_path,
    'status', c.status,
    'status_label', c.status_label,
    'status_style_code', c.status_style_code,
    'published_at', c.published_at,
    'created_at', c.created_at,
    'conversation_id', c.conversation_id,
    'purchase_offer_id', c.purchase_offer_id,
    'event_at', c.event_at,
    'views_count', c.views_count,
    'offers_count', c.offers_count,
    'unread_count', c.unread_count,
    'has_unopened', c.unread_count > 0,
    'due_at', c.due_at,
    'is_overdue', c.is_overdue,
    'seller_interaction_state', case
      when c.conversation_id is null then 'new'
      else 'opened'
    end,
    'priority', jsonb_build_object(
      'code', c.resolved_stage_code,
      'label', null,
      'style_code', null,
      'rank', floor(c.resolved_ranking_score)::integer
    ),
    'reason', jsonb_build_object(
      'code', c.resolved_reason_code,
      'label', c.resolved_reason_label,
      'detail', null
    ),
    'action', case
      when c.action_code is null then null
      else jsonb_build_object(
        'code', c.action_code,
        'label', c.action_label,
        'icon', c.action_icon,
        'style_code', c.action_style_code,
        'ui_slot', c.ui_slot,
        'execution_type', c.execution_type,
        'target', c.target
      )
    end,
    'navigation', jsonb_build_object(
      'target', case when c.conversation_id is null then 'seller_opportunity' else 'conversation' end,
      'purchase_request_id', c.id,
      'conversation_id', c.conversation_id
    ),
    'ranking_score', floor(c.resolved_ranking_score)::integer
  )
from classified c;
$function$;
