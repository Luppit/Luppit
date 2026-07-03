create or replace function public.get_current_profile_conversations(
  p_profile_id uuid,
  p_search_text text default null::text,
  p_start_date date default null::date,
  p_end_date date default null::date,
  p_category_ids uuid[] default null::uuid[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_buyer_role_id uuid;
  v_seller_role_id uuid;
  v_is_seller boolean;
  v_search_text text := nullif(trim(coalesce(p_search_text, '')), '');
  v_search_terms text[];
begin
  if v_search_text is not null then
    v_search_terms := array_remove(regexp_split_to_array(lower(translate(
      v_search_text,
      'ÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãåéèëêíìïîóòöôõúùüûñç',
      'AAAAAAEEEEIIIIOOOOOUUUUNCaaaaaaeeeeiiiiooooouuuunc'
    )), '\s+'), '');
  end if;

  if not exists (
    select 1
    from profile p
    where p.id = p_profile_id
      and p.user_id = auth.uid()
  ) then
    return jsonb_build_object('items', '[]'::jsonb);
  end if;

  select id
  into v_buyer_role_id
  from role
  where lower(coalesce(role_code, name, '')) = 'buyer'
  limit 1;

  select id
  into v_seller_role_id
  from role
  where lower(coalesce(role_code, name, '')) = 'seller'
  limit 1;

  select exists (
    select 1
    from conversation c
    where c.seller_profile_id = p_profile_id
  )
  into v_is_seller;

  if v_is_seller then
    return (
      with rows as (
        select
          c.id as conversation_id,
          c.purchase_request_id,
          c.purchase_offer_id,

          coalesce(nullif(trim(buyer.name), ''), 'Comprador') as display_name,
          nullif(trim(buyer.name), '') as buyer_profile_name,
          nullif(trim(buyer.name), '') as request_profile_name,
          nullif(trim(business.name), '') as business_name,

          pr.title as request_title,
          pr.category_id as request_category_id,
          coalesce(pr.category_name, cat.name) as request_category_name,

          c.status_code,
          coalesce(cs.description, c.status_code) as status_label,

          lm.text as last_message_text,
          lm.message_kind as last_message_kind,
          coalesce(lm.created_at, c.created_at) as last_message_at,

          coalesce(unread.unopened_count, 0) as unopened_count,
          coalesce(unread.unopened_count, 0) > 0 as has_unopened,
          lower(translate(
            array_to_string(array[
              coalesce(nullif(trim(buyer.name), ''), 'Comprador'),
              coalesce(nullif(trim(business.name), ''), ''),
              coalesce(pr.title, ''),
              coalesce(pr.summary_text, ''),
              coalesce(pr.category_name, cat.name, ''),
              coalesce(cs.description, c.status_code, ''),
              coalesce(lm.text, '')
            ], ' '),
            'ÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãåéèëêíìïîóòöôõúùüûñç',
            'AAAAAAEEEEIIIIOOOOOUUUUNCaaaaaaeeeeiiiiooooouuuunc'
          )) as search_text
        from conversation c
        left join profile buyer on buyer.id = c.buyer_profile_id
        left join purchase_request pr on pr.id = c.purchase_request_id
        left join category cat on cat.id = pr.category_id
        left join conversation_status cs on cs.code = c.status_code
        left join lateral (
          select b.name
          from profile_business pb
          join business b on b.id = pb.business_id
          where pb.profile_id = c.seller_profile_id
          order by pb.created_at desc
          limit 1
        ) business on true
        left join lateral (
          select cm.text, cm.message_kind, cm.created_at
          from conversation_message cm
          where cm.conversation_id = c.id
            and (
              cm.visible_to_role_id is null
              or cm.visible_to_role_id = v_seller_role_id
            )
          order by cm.created_at desc, cm.id desc
          limit 1
        ) lm on true
        left join lateral (
          select count(*)::integer as unopened_count
          from conversation_message cm
          where cm.conversation_id = c.id
            and upper(coalesce(cm.message_kind, '')) <> 'SYSTEM'
            and (
              cm.visible_to_role_id is null
              or cm.visible_to_role_id = v_seller_role_id
            )
            and cm.seller_open_state = 'unopened'
        ) unread on true
        where c.seller_profile_id = p_profile_id
          and exists (
            select 1
            from conversation_message seller_message
            where seller_message.conversation_id = c.id
              and seller_message.sender_profile_id = c.seller_profile_id
              and upper(coalesce(seller_message.message_kind, '')) <> 'SYSTEM'
          )
      ),
      filtered as (
        select *
        from rows
        where
          (
            v_search_terms is null
            or cardinality(v_search_terms) = 0
            or not exists (
              select 1
              from unnest(v_search_terms) as search_term(term)
              where rows.search_text not like '%' || search_term.term || '%'
            )
          )
          and (p_start_date is null or last_message_at::date >= p_start_date)
          and (p_end_date is null or last_message_at::date <= p_end_date)
          and (
            p_category_ids is null
            or cardinality(p_category_ids) = 0
            or request_category_id = any(p_category_ids)
          )
      )
      select jsonb_build_object(
        'items',
        coalesce(
          jsonb_agg(to_jsonb(filtered) - 'search_text' order by has_unopened desc, last_message_at desc),
          '[]'::jsonb
        )
      )
      from filtered
    );
  end if;

  return (
    with rows as (
      select
        c.id as conversation_id,
        c.purchase_request_id,
        c.purchase_offer_id,

        coalesce(nullif(trim(business.name), ''), 'Negocio') as display_name,
        nullif(trim(business.name), '') as business_name,
        nullif(trim(buyer.name), '') as buyer_profile_name,
        nullif(trim(buyer.name), '') as request_profile_name,

        pr.title as request_title,
        pr.category_id as request_category_id,
        coalesce(pr.category_name, cat.name) as request_category_name,

        c.status_code,
        coalesce(cs.description, c.status_code) as status_label,

        lm.text as last_message_text,
        lm.message_kind as last_message_kind,
        coalesce(lm.created_at, c.created_at) as last_message_at,

        coalesce(unread.unopened_count, 0) as unopened_count,
        coalesce(unread.unopened_count, 0) > 0 as has_unopened,
        lower(translate(
          array_to_string(array[
            coalesce(nullif(trim(business.name), ''), 'Negocio'),
            coalesce(nullif(trim(buyer.name), ''), ''),
            coalesce(pr.title, ''),
            coalesce(pr.summary_text, ''),
            coalesce(pr.category_name, cat.name, ''),
            coalesce(cs.description, c.status_code, ''),
            coalesce(lm.text, '')
          ], ' '),
          'ÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãåéèëêíìïîóòöôõúùüûñç',
          'AAAAAAEEEEIIIIOOOOOUUUUNCaaaaaaeeeeiiiiooooouuuunc'
        )) as search_text
      from conversation c
      left join profile buyer on buyer.id = c.buyer_profile_id
      left join purchase_request pr on pr.id = c.purchase_request_id
      left join category cat on cat.id = pr.category_id
      left join conversation_status cs on cs.code = c.status_code
      left join lateral (
        select b.name
        from profile_business pb
        join business b on b.id = pb.business_id
        where pb.profile_id = c.seller_profile_id
        order by pb.created_at desc
        limit 1
      ) business on true
      left join lateral (
        select cm.text, cm.message_kind, cm.created_at
        from conversation_message cm
        where cm.conversation_id = c.id
          and (
            cm.visible_to_role_id is null
            or cm.visible_to_role_id = v_buyer_role_id
          )
        order by cm.created_at desc, cm.id desc
        limit 1
      ) lm on true
      left join lateral (
        select count(*)::integer as unopened_count
        from conversation_message cm
        where cm.conversation_id = c.id
          and upper(coalesce(cm.message_kind, '')) <> 'SYSTEM'
          and (
            cm.visible_to_role_id is null
            or cm.visible_to_role_id = v_buyer_role_id
          )
          and cm.buyer_open_state = 'unopened'
      ) unread on true
      where c.buyer_profile_id = p_profile_id
        and exists (
          select 1
          from conversation_message seller_message
          where seller_message.conversation_id = c.id
            and seller_message.sender_profile_id = c.seller_profile_id
            and upper(coalesce(seller_message.message_kind, '')) <> 'SYSTEM'
        )
    ),
    filtered as (
      select *
      from rows
      where
        (
          v_search_terms is null
          or cardinality(v_search_terms) = 0
          or not exists (
            select 1
            from unnest(v_search_terms) as search_term(term)
            where rows.search_text not like '%' || search_term.term || '%'
          )
        )
        and (p_start_date is null or last_message_at::date >= p_start_date)
        and (p_end_date is null or last_message_at::date <= p_end_date)
        and (
          p_category_ids is null
          or cardinality(p_category_ids) = 0
          or request_category_id = any(p_category_ids)
        )
    )
    select jsonb_build_object(
      'items',
      coalesce(
        jsonb_agg(to_jsonb(filtered) - 'search_text' order by has_unopened desc, last_message_at desc),
        '[]'::jsonb
      )
    )
    from filtered
  );
end;
$function$;

revoke all on function public.get_current_profile_conversations(uuid, text, date, date, uuid[]) from public;
grant execute on function public.get_current_profile_conversations(uuid, text, date, date, uuid[]) to authenticated;
