-- Tighten RLS: authenticated role gets SELECT-only.
-- All writes go through the service_role client which bypasses RLS.

-- =========================================================
-- 0) Ensure RLS is on (safe to re-run)
-- =========================================================
alter table public.sales_reps         enable row level security;
alter table public.clients            enable row level security;
alter table public.commission_events  enable row level security;
alter table public.quarterly_bonuses  enable row level security;
alter table public.payouts            enable row level security;

-- =========================================================
-- 1) Privileges: grant SELECT only, revoke everything else
-- =========================================================
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

-- =========================================================
-- 2) Replace admin FOR ALL policies with SELECT-only
-- =========================================================
drop policy if exists "sales_reps_admin_all" on public.sales_reps;
create policy "sales_reps_admin_select" on public.sales_reps
  for select to authenticated
  using (public.is_admin(auth.jwt() ->> 'sub'));

drop policy if exists "clients_admin_all" on public.clients;
create policy "clients_admin_select" on public.clients
  for select to authenticated
  using (public.is_admin(auth.jwt() ->> 'sub'));

drop policy if exists "commission_events_admin_all" on public.commission_events;
create policy "commission_events_admin_select" on public.commission_events
  for select to authenticated
  using (public.is_admin(auth.jwt() ->> 'sub'));

drop policy if exists "quarterly_bonuses_admin_all" on public.quarterly_bonuses;
create policy "quarterly_bonuses_admin_select" on public.quarterly_bonuses
  for select to authenticated
  using (public.is_admin(auth.jwt() ->> 'sub'));

drop policy if exists "payouts_admin_all" on public.payouts;
create policy "payouts_admin_select" on public.payouts
  for select to authenticated
  using (public.is_admin(auth.jwt() ->> 'sub'));

-- =========================================================
-- 3) Re-create rep policies with explicit FOR SELECT + TO
-- =========================================================
drop policy if exists "sales_reps_self_select" on public.sales_reps;
create policy "sales_reps_self_select" on public.sales_reps
  for select to authenticated
  using (clerk_user_id = auth.jwt() ->> 'sub');

drop policy if exists "clients_rep_select" on public.clients;
create policy "clients_rep_select" on public.clients
  for select to authenticated
  using (
    sales_rep_id in (
      select id from public.sales_reps where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

drop policy if exists "commission_events_rep_select" on public.commission_events;
create policy "commission_events_rep_select" on public.commission_events
  for select to authenticated
  using (
    sales_rep_id in (
      select id from public.sales_reps where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

drop policy if exists "quarterly_bonuses_rep_select" on public.quarterly_bonuses;
create policy "quarterly_bonuses_rep_select" on public.quarterly_bonuses
  for select to authenticated
  using (
    sales_rep_id in (
      select id from public.sales_reps where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

drop policy if exists "payouts_rep_select" on public.payouts;
create policy "payouts_rep_select" on public.payouts
  for select to authenticated
  using (
    sales_rep_id in (
      select id from public.sales_reps where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );
