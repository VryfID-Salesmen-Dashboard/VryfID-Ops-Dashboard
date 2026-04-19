-- VryfID Ops Dashboard — Phase 1 schema
-- Integrates with Clerk auth via Supabase's third-party JWT integration.
-- `auth.jwt() ->> 'sub'` returns the Clerk user ID.

set check_function_bodies = off;

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- sales_reps
-- ============================================================================
create table public.sales_reps (
  id                      uuid primary key default gen_random_uuid(),
  clerk_user_id           text unique not null,
  first_name              text not null,
  last_name               text not null,
  email                   text unique not null,
  phone                   text,
  role                    text not null default 'sales_rep' check (role in ('admin', 'sales_rep')),
  status                  text not null default 'active'    check (status in ('active', 'inactive', 'terminated')),
  lifetime_clients_signed integer not null default 0,
  current_tier            text not null default 'starter'   check (current_tier in ('starter', 'proven', 'elite')),
  start_date              date not null,
  territory               text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index sales_reps_clerk_user_id_idx on public.sales_reps (clerk_user_id);
create index sales_reps_role_idx on public.sales_reps (role);

create trigger sales_reps_set_updated_at
  before update on public.sales_reps
  for each row execute function public.set_updated_at();

-- ============================================================================
-- is_admin() — SECURITY DEFINER to bypass RLS recursion in policies
-- ============================================================================
create or replace function public.is_admin(clerk_sub text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sales_reps
    where clerk_user_id = clerk_sub
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin(text) from public;
grant execute on function public.is_admin(text) to authenticated, anon;

-- ============================================================================
-- clients
-- ============================================================================
create table public.clients (
  id                      uuid primary key default gen_random_uuid(),
  sales_rep_id            uuid not null references public.sales_reps(id) on delete restrict,
  stripe_customer_id      text unique not null,
  company_name            text not null,
  client_type             text not null check (client_type in ('landlord_pm', 'brokerage')),
  unit_count              integer,
  agent_count             integer,
  dashboard_count         integer not null default 1,
  monthly_subscription    numeric(10,2) not null,
  sign_date               date not null,
  commission_end_date     date not null,
  commission_rate_locked  numeric(5,4) not null,
  status                  text not null default 'active' check (status in ('active', 'churned', 'paused')),
  churned_date            date,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index clients_sales_rep_id_idx on public.clients (sales_rep_id);
create index clients_stripe_customer_id_idx on public.clients (stripe_customer_id);
create index clients_sign_date_idx on public.clients (sign_date);
create index clients_status_idx on public.clients (status);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ============================================================================
-- commission_events
-- ============================================================================
create table public.commission_events (
  id                  uuid primary key default gen_random_uuid(),
  sales_rep_id        uuid not null references public.sales_reps(id) on delete restrict,
  client_id           uuid not null references public.clients(id)    on delete restrict,
  stripe_payment_id   text not null,
  event_type          text not null check (event_type in ('subscription', 'verification')),
  payment_amount      numeric(10,2) not null,
  commission_rate     numeric(5,4) not null,
  commission_amount   numeric(10,2) not null,
  period_start        date not null,
  period_end          date not null,
  status              text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'voided')),
  approved_at         timestamptz,
  paid_at             timestamptz,
  voided_at           timestamptz,
  void_reason         text,
  created_at          timestamptz not null default now()
);

create unique index commission_events_stripe_payment_type_uniq
  on public.commission_events (stripe_payment_id, event_type);
create index commission_events_sales_rep_id_idx on public.commission_events (sales_rep_id);
create index commission_events_client_id_idx on public.commission_events (client_id);
create index commission_events_status_idx on public.commission_events (status);
create index commission_events_period_idx on public.commission_events (period_start, period_end);

-- ============================================================================
-- quarterly_bonuses
-- ============================================================================
create table public.quarterly_bonuses (
  id                      uuid primary key default gen_random_uuid(),
  sales_rep_id            uuid not null references public.sales_reps(id) on delete restrict,
  quarter                 text not null,
  new_clients_count       integer not null default 0,
  acquisition_bonus       numeric(10,2) not null default 0,
  total_verifications     integer not null default 0,
  volume_bonus            numeric(10,2) not null default 0,
  retention_rate          numeric(5,4),
  retention_bonus         numeric(10,2) not null default 0,
  total_bonus             numeric(10,2) not null default 0,
  status                  text not null default 'calculated' check (status in ('calculated', 'approved', 'paid')),
  created_at              timestamptz not null default now(),
  unique (sales_rep_id, quarter)
);

create index quarterly_bonuses_sales_rep_id_idx on public.quarterly_bonuses (sales_rep_id);
create index quarterly_bonuses_quarter_idx on public.quarterly_bonuses (quarter);

-- ============================================================================
-- payouts
-- ============================================================================
create table public.payouts (
  id                  uuid primary key default gen_random_uuid(),
  sales_rep_id        uuid not null references public.sales_reps(id) on delete restrict,
  payout_date         date not null,
  period_label        text not null,
  subscription_total  numeric(10,2) not null default 0,
  verification_total  numeric(10,2) not null default 0,
  bonus_total         numeric(10,2) not null default 0,
  gross_total         numeric(10,2) not null default 0,
  notes               text,
  status              text not null default 'pending' check (status in ('pending', 'paid')),
  created_at          timestamptz not null default now()
);

create index payouts_sales_rep_id_idx on public.payouts (sales_rep_id);
create index payouts_payout_date_idx on public.payouts (payout_date);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.sales_reps         enable row level security;
alter table public.clients            enable row level security;
alter table public.commission_events  enable row level security;
alter table public.quarterly_bonuses  enable row level security;
alter table public.payouts            enable row level security;

-- Authenticated role gets SELECT only; all writes go through service_role.
revoke all on public.sales_reps from authenticated;
revoke all on public.clients from authenticated;
revoke all on public.commission_events from authenticated;
revoke all on public.quarterly_bonuses from authenticated;
revoke all on public.payouts from authenticated;

grant select on public.sales_reps to authenticated;
grant select on public.clients to authenticated;
grant select on public.commission_events to authenticated;
grant select on public.quarterly_bonuses to authenticated;
grant select on public.payouts to authenticated;

-- sales_reps: rep sees own row; admin sees all.
create policy "sales_reps_self_select" on public.sales_reps
  for select to authenticated
  using (clerk_user_id = auth.jwt() ->> 'sub');

create policy "sales_reps_admin_select" on public.sales_reps
  for select to authenticated
  using (public.is_admin(auth.jwt() ->> 'sub'));

-- clients: rep sees own clients; admin sees all.
create policy "clients_rep_select" on public.clients
  for select to authenticated
  using (
    sales_rep_id in (
      select id from public.sales_reps where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "clients_admin_select" on public.clients
  for select to authenticated
  using (public.is_admin(auth.jwt() ->> 'sub'));

-- commission_events: rep sees own; admin all.
create policy "commission_events_rep_select" on public.commission_events
  for select to authenticated
  using (
    sales_rep_id in (
      select id from public.sales_reps where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "commission_events_admin_select" on public.commission_events
  for select to authenticated
  using (public.is_admin(auth.jwt() ->> 'sub'));

-- quarterly_bonuses: rep sees own; admin all.
create policy "quarterly_bonuses_rep_select" on public.quarterly_bonuses
  for select to authenticated
  using (
    sales_rep_id in (
      select id from public.sales_reps where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "quarterly_bonuses_admin_select" on public.quarterly_bonuses
  for select to authenticated
  using (public.is_admin(auth.jwt() ->> 'sub'));

-- payouts: rep sees own; admin all.
create policy "payouts_rep_select" on public.payouts
  for select to authenticated
  using (
    sales_rep_id in (
      select id from public.sales_reps where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "payouts_admin_select" on public.payouts
  for select to authenticated
  using (public.is_admin(auth.jwt() ->> 'sub'));
