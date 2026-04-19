-- Seed data for VryfID Ops Dashboard
-- Run this AFTER applying all migrations.
-- Replace clerk_user_id values with actual Clerk user IDs from your Clerk dashboard.

-- Admins: Gabe and Aiden
INSERT INTO public.sales_reps (
  clerk_user_id, first_name, last_name, email, role, status,
  lifetime_clients_signed, current_tier, start_date
) VALUES
  (
    'REPLACE_WITH_GABE_CLERK_ID',
    'Gabe', 'Zeinhorn', 'gzeinhorn@gmail.com',
    'admin', 'active', 0, 'starter', '2026-01-01'
  ),
  (
    'REPLACE_WITH_AIDEN_CLERK_ID',
    'Aiden', 'Einhorn', 'aiden@vryfid.com',
    'admin', 'active', 0, 'starter', '2026-01-01'
  )
ON CONFLICT (email) DO NOTHING;

-- Test sales rep
INSERT INTO public.sales_reps (
  clerk_user_id, first_name, last_name, email, role, status,
  lifetime_clients_signed, current_tier, start_date, territory
) VALUES
  (
    'REPLACE_WITH_TEST_REP_CLERK_ID',
    'Test', 'Rep', 'testrep@vryfid.com',
    'sales_rep', 'active', 3, 'starter', '2026-03-01', 'Northeast'
  )
ON CONFLICT (email) DO NOTHING;
