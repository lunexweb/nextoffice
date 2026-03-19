-- ============================================================
-- 009_leads.sql — Lead tracker for CEO Dashboard
-- ============================================================

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  business_name text,
  industry    text,
  email       text,
  whatsapp    text,
  phone       text,
  notes       text,
  converted   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at on every UPDATE
create or replace function public.handle_leads_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on public.leads
  for each row
  execute function public.handle_leads_updated_at();

-- RLS: only CEO role can access leads
alter table public.leads enable row level security;

create policy "CEO can manage leads"
  on public.leads
  for all
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'ceo'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'ceo'
    )
  );

-- Index for common queries
create index if not exists idx_leads_converted on public.leads (converted);
create index if not exists idx_leads_created_at on public.leads (created_at desc);
