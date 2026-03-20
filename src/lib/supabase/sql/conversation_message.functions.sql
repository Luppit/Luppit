-- Conversation messaging migration + RPCs
-- Run this in Supabase SQL editor.

-- 0) schema support for media messages
alter table public.conversation_message
add column if not exists image_path text null;

-- 1) storage bucket (private)
insert into storage.buckets (id, name, public)
values ('conversations', 'conversations', false)
on conflict (id) do nothing;

-- 2) storage policies for authenticated users
drop policy if exists "conversations_select_authenticated" on storage.objects;
create policy "conversations_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'conversations');

drop policy if exists "conversations_insert_authenticated" on storage.objects;
create policy "conversations_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'conversations');

drop policy if exists "conversations_update_authenticated" on storage.objects;
create policy "conversations_update_authenticated"
on storage.objects for update
to authenticated
using (bucket_id = 'conversations')
with check (bucket_id = 'conversations');

drop policy if exists "conversations_delete_authenticated" on storage.objects;
create policy "conversations_delete_authenticated"
on storage.objects for delete
to authenticated
using (bucket_id = 'conversations');

create or replace function public.get_conversation_messages(
  p_conversation_id uuid
)
returns setof public.conversation_message
language sql
security definer
set search_path = public
as $$
  select cm.*
  from public.conversation_message cm
  where cm.conversation_id = p_conversation_id
  order by cm.created_at asc;
$$;

create or replace function public.send_conversation_message(
  p_conversation_id uuid,
  p_profile_id uuid,
  p_text text default null,
  p_message_kind text default 'TEXT',
  p_image_path text default null
)
returns public.conversation_message
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversation%rowtype;
  v_role_code text;
  v_can_send boolean;
  v_message public.conversation_message%rowtype;
  v_kind text;
begin
  if p_conversation_id is null or p_profile_id is null then
    raise exception 'validation_error';
  end if;

  v_kind := upper(coalesce(p_message_kind, 'TEXT'));

  if v_kind = 'TEXT' and trim(coalesce(p_text, '')) = '' then
    raise exception 'validation_error';
  end if;

  if v_kind = 'IMAGE' and trim(coalesce(p_image_path, '')) = '' then
    raise exception 'validation_error';
  end if;

  select *
  into v_conversation
  from public.conversation
  where id = p_conversation_id;

  if not found then
    raise exception 'conversation_not_found';
  end if;

  if p_profile_id = v_conversation.buyer_profile_id then
    v_role_code := 'BUYER';
  elsif p_profile_id = v_conversation.seller_profile_id then
    v_role_code := 'SELLER';
  else
    raise exception 'profile_not_in_conversation';
  end if;

  if v_kind = 'TEXT' then
    select coalesce(csr.can_send_messages, false)
    into v_can_send
    from public.conversation_status_role_rule csr
    join public.role r on r.id = csr.role_id
    where csr.conversation_status = v_conversation.status_code
      and r.role_code = v_role_code
    limit 1;

    if coalesce(v_can_send, false) = false then
      raise exception 'messages_not_allowed_for_current_status';
    end if;
  elsif v_kind = 'IMAGE' then
    select coalesce(csr.can_send_attachments, false)
    into v_can_send
    from public.conversation_status_role_rule csr
    join public.role r on r.id = csr.role_id
    where csr.conversation_status = v_conversation.status_code
      and r.role_code = v_role_code
    limit 1;

    if coalesce(v_can_send, false) = false then
      raise exception 'attachments_not_allowed_for_current_status';
    end if;
  else
    raise exception 'unsupported_message_kind';
  end if;

  insert into public.conversation_message (
    conversation_id,
    sender_profile_id,
    text,
    message_kind,
    image_path
  )
  values (
    p_conversation_id,
    p_profile_id,
    case when v_kind = 'TEXT' then trim(coalesce(p_text, '')) else null end,
    v_kind,
    case when v_kind = 'IMAGE' then trim(coalesce(p_image_path, '')) else null end
  )
  returning * into v_message;

  return v_message;
end;
$$;
