-- Daily Stripe sync log for catching missed webhooks

create table public.sync_log (
  id              uuid primary key default gen_random_uuid(),
  sync_date       date not null,
  stripe_txn_id   text not null,
  discrepancy     text not null,
  resolved        boolean not null default false,
  resolved_at     timestamptz,
  notes           text,
  created_at      timestamptz not null default now()
);

create index sync_log_sync_date_idx on public.sync_log (sync_date);
create index sync_log_resolved_idx on public.sync_log (resolved) where not resolved;

alter table public.sync_log enable row level security;

-- Only admins can view sync log (via service role or authenticated admin)
revoke all on public.sync_log from authenticated;
grant select on public.sync_log to authenticated;

create policy "sync_log_admin_select" on public.sync_log
  for select to authenticated
  using (public.is_admin(auth.jwt() ->> 'sub'));
