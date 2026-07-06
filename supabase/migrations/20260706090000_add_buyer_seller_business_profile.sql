create or replace function public.get_buyer_visible_business_profile(
  p_profile_id uuid,
  p_conversation_id uuid default null,
  p_purchase_request_id uuid default null,
  p_purchase_offer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_business public.business%rowtype;
  v_business_id uuid;
  v_request_id uuid;
  v_offer_id uuid;
  v_seller_profile_id uuid;
  v_rating numeric;
  v_num_ratings integer;
begin
  if p_profile_id is null then
    raise exception 'missing_profile_id' using errcode = '22023';
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
      and lower(coalesce(r.role_code, r.name, '')) = 'buyer'
  ) then
    raise exception 'buyer_role_required' using errcode = '42501';
  end if;

  if p_conversation_id is not null then
    select
      c.purchase_request_id,
      c.purchase_offer_id,
      c.seller_profile_id
    into
      v_request_id,
      v_offer_id,
      v_seller_profile_id
    from public.conversation c
    where c.id = p_conversation_id
      and c.buyer_profile_id = p_profile_id;

    if not found then
      raise exception 'conversation_not_found' using errcode = 'P0002';
    end if;

    if v_offer_id is not null then
      select po.business_id
      into v_business_id
      from public.purchase_offer po
      where po.id = v_offer_id
        and (
          v_request_id is null
          or po.purchase_request_id = v_request_id
        );
    end if;

    if v_business_id is null and v_seller_profile_id is not null then
      select pb.business_id
      into v_business_id
      from public.profile_business pb
      where pb.profile_id = v_seller_profile_id
      order by pb.created_at desc
      limit 1;
    end if;
  else
    if p_purchase_request_id is null or p_purchase_offer_id is null then
      raise exception 'missing_offer_context' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.purchase_request pr
      where pr.id = p_purchase_request_id
        and pr.profile_id = p_profile_id
    ) then
      raise exception 'purchase_request_not_found' using errcode = 'P0002';
    end if;

    select po.business_id
    into v_business_id
    from public.purchase_offer po
    where po.id = p_purchase_offer_id
      and po.purchase_request_id = p_purchase_request_id;
  end if;

  if v_business_id is null then
    raise exception 'business_not_found' using errcode = 'P0002';
  end if;

  select *
  into v_business
  from public.business b
  where b.id = v_business_id;

  if not found then
    raise exception 'business_not_found' using errcode = 'P0002';
  end if;

  select brs.rating, brs.num_ratings
  into v_rating, v_num_ratings
  from public.business_rating_summary brs
  where brs.business_id = v_business.id;

  return (
    with location_payload as (
      select jsonb_build_object(
        'id', l.id,
        'province', l.province,
        'canton', l.canton,
        'district', l.district
      ) as data
      from public.location l
      where l.id = v_business.location_id
    ),
    category_payload as (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', bcp.id,
            'category_id', c.id,
            'name', c.name,
            'path', c.path::text
          )
          order by c.name
        ),
        '[]'::jsonb
      ) as data
      from public.business_category_preference bcp
      join public.category c
        on c.id = bcp.category_id
      where bcp.business_id = v_business.id
    ),
    rating_tag_counts as (
      select
        nullif(btrim(tag.label), '') as label,
        count(*)::integer as tag_count
      from public.conversation_rating cr
      cross join lateral jsonb_array_elements_text(
        case
          when jsonb_typeof(cr.tags) = 'array' then cr.tags
          else '[]'::jsonb
        end
      ) as tag(label)
      where cr.rated_business_id = v_business.id
      group by nullif(btrim(tag.label), '')
    ),
    rating_tag_payload as (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'label', ranked.label,
            'count', ranked.tag_count
          )
          order by ranked.tag_count desc, ranked.label
        ),
        '[]'::jsonb
      ) as data
      from (
        select label, tag_count
        from rating_tag_counts
        where label is not null
        order by tag_count desc, label
        limit 8
      ) ranked
    ),
    review_payload as (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', recent.id,
            'stars', recent.stars,
            'comment', recent.comment,
            'tags', recent.tags,
            'created_at', recent.created_at
          )
          order by recent.created_at desc
        ),
        '[]'::jsonb
      ) as data
      from (
        select
          cr.id,
          cr.stars,
          cr.comment,
          cr.tags,
          cr.created_at
        from public.conversation_rating cr
        where cr.rated_business_id = v_business.id
          and nullif(btrim(coalesce(cr.comment, '')), '') is not null
        order by cr.created_at desc
        limit 5
      ) recent
    )
    select jsonb_build_object(
      'business', jsonb_build_object(
        'id', v_business.id,
        'name', v_business.name,
        'document_label', case
          when nullif(btrim(coalesce(v_business.id_document, '')), '') is null then null
          else 'Registrado' || case
            when regexp_replace(v_business.id_document, '\D', '', 'g') <> ''
              then ' **** ' || right(regexp_replace(v_business.id_document, '\D', '', 'g'), 4)
            else ''
          end
        end,
        'created_at', v_business.created_at,
        'rating', v_rating,
        'num_ratings', coalesce(v_num_ratings, 0),
        'location', (select data from location_payload)
      ),
      'categories', (select data from category_payload),
      'rating_tags', (select data from rating_tag_payload),
      'reviews', (select data from review_payload)
    )
  );
end;
$function$;

revoke all on function public.get_buyer_visible_business_profile(
  uuid,
  uuid,
  uuid,
  uuid
) from public;

grant execute on function public.get_buyer_visible_business_profile(
  uuid,
  uuid,
  uuid,
  uuid
) to authenticated;

insert into public.conversation_action_executor (
  code,
  execution_type,
  target,
  requires_refresh
)
values (
  'OPEN_SELLER_BUSINESS_PROFILE',
  'client_command',
  'detail.seller_business',
  false
)
on conflict (code) do update
set
  execution_type = excluded.execution_type,
  target = excluded.target,
  requires_refresh = excluded.requires_refresh;

do $$
declare
  v_action_id uuid;
begin
  select ca.id
  into v_action_id
  from public.conversation_action ca
  where ca.code = 'BUYER_SHOW_SELLER_BUSINESS'
  order by ca.created_at
  limit 1;

  if v_action_id is null then
    insert into public.conversation_action (
      code,
      label,
      icon,
      style_code,
      ui_slot,
      executor_code
    )
    values (
      'BUYER_SHOW_SELLER_BUSINESS',
      'Mostrar negocio',
      'house',
      'black',
      'MENU',
      'OPEN_SELLER_BUSINESS_PROFILE'
    )
    returning id into v_action_id;
  else
    update public.conversation_action
    set
      label = 'Mostrar negocio',
      icon = 'house',
      style_code = 'black',
      ui_slot = 'MENU',
      executor_code = 'OPEN_SELLER_BUSINESS_PROFILE'
    where id = v_action_id;
  end if;

  insert into public.conversation_status_role_action (
    status_code,
    action_id,
    role_id,
    is_enabled,
    sort_order
  )
  select
    cs.code,
    v_action_id,
    r.id,
    true,
    880
  from public.conversation_status cs
  join public.role r
    on lower(coalesce(r.role_code, r.name, '')) = 'buyer'
  where not exists (
    select 1
    from public.conversation_status_role_action csra
    where csra.status_code = cs.code
      and csra.action_id = v_action_id
      and csra.role_id = r.id
  );

  update public.conversation_status_role_action csra
  set
    is_enabled = true,
    sort_order = 880
  from public.role r
  where csra.action_id = v_action_id
    and csra.role_id = r.id
    and lower(coalesce(r.role_code, r.name, '')) = 'buyer';
end $$;
