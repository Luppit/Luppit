create table if not exists public.legal_document (
  code text primary key,
  title text not null,
  version_label text null,
  effective_date date null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_document_code_not_blank
    check (length(trim(code)) > 0),
  constraint legal_document_title_not_blank
    check (length(trim(title)) > 0)
);

create table if not exists public.legal_document_section (
  id uuid primary key default gen_random_uuid(),
  document_code text not null references public.legal_document(code) on delete cascade,
  heading text null,
  body text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_document_section_body_not_blank
    check (length(trim(body)) > 0)
);

create index if not exists legal_document_section_document_order_idx
  on public.legal_document_section(document_code, sort_order, created_at);

alter table public.legal_document enable row level security;
alter table public.legal_document_section enable row level security;

grant select on table public.legal_document to anon, authenticated;
grant select on table public.legal_document_section to anon, authenticated;

drop policy if exists "Active legal documents are readable"
  on public.legal_document;

create policy "Active legal documents are readable"
  on public.legal_document
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Active legal document sections are readable"
  on public.legal_document_section;

create policy "Active legal document sections are readable"
  on public.legal_document_section
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.legal_document d
      where d.code = legal_document_section.document_code
        and d.is_active = true
    )
  );
