# CLAUDE.md — VryfID Sales Commission & Financial Dashboard

## What This Project Is

A full-stack web application that serves as VryfID's internal financial operations dashboard. It connects to Stripe (our payment processor) and tracks sales representative commissions across two revenue streams: subscription fees and verification fees. Salespeople can log in and see their own performance. Admins (Gabe and Aiden) see everything.

This is NOT a QuickBooks replacement. QuickBooks remains our system of record for accounting. This dashboard is the **operational layer** that sits between Stripe (where money flows) and QuickBooks (where money is recorded), handling the commission logic that neither system can do natively.

---

## Tech Stack (Do Not Deviate)

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js 15 (App Router)** with TypeScript | Server Components for secure API calls, API routes for webhooks |
| Database | **Supabase** (PostgreSQL) | Row Level Security for role-based access, built-in auth option, realtime subscriptions |
| Auth | **Clerk** | Pre-built RBAC with roles (admin, sales_rep), native Next.js integration, Supabase RLS integration |
| Payments Data | **Stripe API** (Node.js SDK `stripe`) | Already our payment processor — pull all revenue data from here |
| UI Components | **shadcn/ui** + **Tailwind CSS** | Clean, accessible, composable |
| Charts | **Tremor** (`@tremor/react`) | Purpose-built dashboard components (KPI cards, area charts, bar charts, tables) |
| Deployment | **Vercel** | Native Next.js hosting, edge functions, environment variable management |
| Background Jobs | **Vercel Cron** (or **Inngest** if complexity requires) | Quarterly bonus calculations, commission rollups |

### Brand Colors (use throughout UI)
- Primary dark: `#1A1A1A` (charcoal)
- Primary accent: `#4BAE8A` (VryfID green)
- Use Tailwind's neutral palette for grays
- Light mode only for v1

---

## VryfID's Business Model (Context You Need)

VryfID is a digital identity and document verification platform for the rental housing industry. We have two client types:

### Client Type 1: Landlords / Property Managers
- Pay a **monthly subscription** based on number of units managed
- Run **verifications** on prospective tenants (each verification generates a fee)
- More units = more verifications = more revenue

### Client Type 2: Brokerages
- Pay a **monthly subscription** based on number of agents
- Each agent runs verifications on prospective renters
- More agents = dramatically more verifications

### Revenue Streams
1. **Subscription revenue** — monthly recurring fee per client (varies by size)
2. **Verification revenue** — per-verification fee each time a client runs a check

Both streams flow through Stripe. Subscriptions are Stripe Subscriptions. Verifications are either metered billing line items or one-time charges attached to the customer.

---

## Commission Structure (CRITICAL — encode this exactly)

Sales reps earn on BOTH revenue streams for **12 months** from the date each client was signed. After 12 months, that client's commission payments to the rep stop (but VryfID continues earning).

### Layer 1: Subscription Commission
- Rep earns a **percentage of every monthly subscription payment** their client makes
- Percentage depends on the rep's **accelerator tier** at the time the client was signed
- Commission runs for **12 months** from client sign date

### Layer 2: Verification Residual
- Rep earns **12%** of every verification fee their client generates
- Fixed at 12% regardless of tier
- Runs for **12 months** from client sign date

### Layer 3: Quarterly Performance Bonuses
Paid at end of each quarter based on three independent metrics:

**Acquisition Bonus (new clients signed that quarter):**
- 1–3 clients: $500
- 4–6 clients: $1,500
- 7–10 clients: $3,000
- 11+ clients: $5,000

**Verification Volume Bonus (total verifications across portfolio that quarter):**
- 1–300: $500
- 301–800: $1,500
- 801–2,000: $3,500
- 2,001+: $5,000

**Client Retention Bonus (starts Q2):**
- Below 80%: $0
- 80–89%: $500
- 90–94%: $1,000
- 95%+: $2,000

**Maximum quarterly bonus: $12,000**

### Accelerator Tiers (Subscription Commission Rate)
The rep's tier is determined by **lifetime clients signed** (cumulative, never resets):

| Tier | Lifetime Clients Signed | Subscription Commission Rate |
|------|------------------------|------------------------------|
| Starter | 1–19 | 25% |
| Proven | 20–49 | 30% |
| Elite | 50+ | 35% |

**CRITICAL RULES:**
- Tiers are **permanent** — once a rep hits Proven, they never go back to Starter
- Tier upgrades apply to **new clients only** — existing clients stay at the rate they were signed under
- The verification residual rate is **always 12%** regardless of tier
- Each client has a `commission_rate_locked` field set at the time of signing based on the rep's tier at that moment

---

## Database Schema

Create these tables in Supabase. Use UUIDs for primary keys. Add created_at and updated_at timestamps to every table.

### `sales_reps`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
clerk_user_id   TEXT UNIQUE NOT NULL          -- links to Clerk auth
first_name      TEXT NOT NULL
last_name       TEXT NOT NULL
email           TEXT UNIQUE NOT NULL
phone           TEXT
role            TEXT NOT NULL DEFAULT 'sales_rep'  -- 'admin' or 'sales_rep'
status          TEXT NOT NULL DEFAULT 'active'     -- 'active', 'inactive', 'terminated'
lifetime_clients_signed  INTEGER DEFAULT 0
current_tier    TEXT NOT NULL DEFAULT 'starter'    -- 'starter', 'proven', 'elite'
start_date      DATE NOT NULL
territory       TEXT                               -- geographic territory description
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### `clients`
```sql
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
sales_rep_id            UUID REFERENCES sales_reps(id) NOT NULL
stripe_customer_id      TEXT UNIQUE NOT NULL
company_name            TEXT NOT NULL
client_type             TEXT NOT NULL              -- 'landlord_pm' or 'brokerage'
unit_count              INTEGER                    -- for landlords/PMs
agent_count             INTEGER                    -- for brokerages
dashboard_count         INTEGER NOT NULL DEFAULT 1
monthly_subscription    DECIMAL(10,2) NOT NULL     -- dollar amount
sign_date               DATE NOT NULL
commission_end_date     DATE NOT NULL              -- sign_date + 12 months
commission_rate_locked  DECIMAL(5,4) NOT NULL      -- rate at time of signing (0.25, 0.30, 0.35)
status                  TEXT NOT NULL DEFAULT 'active'  -- 'active', 'churned', 'paused'
churned_date            DATE
notes                   TEXT
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()
```

### `commission_events`
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
sales_rep_id        UUID REFERENCES sales_reps(id) NOT NULL
client_id           UUID REFERENCES clients(id) NOT NULL
stripe_payment_id   TEXT NOT NULL                 -- Stripe charge/invoice ID
event_type          TEXT NOT NULL                 -- 'subscription' or 'verification'
payment_amount      DECIMAL(10,2) NOT NULL        -- gross amount charged to client
commission_rate     DECIMAL(5,4) NOT NULL         -- rate applied (from locked rate or 0.12)
commission_amount   DECIMAL(10,2) NOT NULL        -- calculated: payment_amount * commission_rate
period_start        DATE NOT NULL                 -- billing period this covers
period_end          DATE NOT NULL
status              TEXT NOT NULL DEFAULT 'pending'  -- 'pending', 'approved', 'paid', 'voided'
approved_at         TIMESTAMPTZ
paid_at             TIMESTAMPTZ
voided_at           TIMESTAMPTZ
void_reason         TEXT
created_at          TIMESTAMPTZ DEFAULT now()
```

### `quarterly_bonuses`
```sql
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
sales_rep_id            UUID REFERENCES sales_reps(id) NOT NULL
quarter                 TEXT NOT NULL              -- '2026-Q1', '2026-Q2', etc.
new_clients_count       INTEGER NOT NULL DEFAULT 0
acquisition_bonus       DECIMAL(10,2) NOT NULL DEFAULT 0
total_verifications     INTEGER NOT NULL DEFAULT 0
volume_bonus            DECIMAL(10,2) NOT NULL DEFAULT 0
retention_rate          DECIMAL(5,4)               -- null for Q1 (retention starts Q2)
retention_bonus         DECIMAL(10,2) NOT NULL DEFAULT 0
total_bonus             DECIMAL(10,2) NOT NULL DEFAULT 0
status                  TEXT NOT NULL DEFAULT 'calculated'  -- 'calculated', 'approved', 'paid'
created_at              TIMESTAMPTZ DEFAULT now()
```

### `payouts`
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
sales_rep_id        UUID REFERENCES sales_reps(id) NOT NULL
payout_date         DATE NOT NULL
period_label        TEXT NOT NULL              -- 'March 2026', 'Q1 2026 Bonus', etc.
subscription_total  DECIMAL(10,2) NOT NULL DEFAULT 0
verification_total  DECIMAL(10,2) NOT NULL DEFAULT 0
bonus_total         DECIMAL(10,2) NOT NULL DEFAULT 0
gross_total         DECIMAL(10,2) NOT NULL DEFAULT 0
notes               TEXT
status              TEXT NOT NULL DEFAULT 'pending'  -- 'pending', 'paid'
created_at          TIMESTAMPTZ DEFAULT now()
```

### Row Level Security Policies

```sql
-- Sales reps can only see their own data
CREATE POLICY "Reps see own data" ON sales_reps
  FOR SELECT USING (clerk_user_id = auth.jwt()->>'sub');

CREATE POLICY "Reps see own clients" ON clients
  FOR SELECT USING (
    sales_rep_id IN (
      SELECT id FROM sales_reps WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

CREATE POLICY "Reps see own commissions" ON commission_events
  FOR SELECT USING (
    sales_rep_id IN (
      SELECT id FROM sales_reps WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- Admins see everything (bypass RLS)
CREATE POLICY "Admins see all" ON sales_reps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales_reps WHERE clerk_user_id = auth.jwt()->>'sub' AND role = 'admin'
    )
  );

-- Apply similar admin policies to all tables
```

---

## Application Pages & Routes

### Auth
- `/sign-in` — Clerk sign-in (redirects to appropriate dashboard based on role)
- `/sign-up` — Disabled for public. Admins create rep accounts.

### Admin Dashboard (`/admin/...`) — requires role = 'admin'
- `/admin` — Overview: total MRR, total commission expense, commission-to-revenue ratio, active reps count, active clients count, revenue chart (last 12 months), top performing reps table
- `/admin/reps` — All sales reps list with status, tier, lifetime clients, MTD earnings. Click into individual rep detail.
- `/admin/reps/[id]` — Individual rep detail: their clients, commission history, tier progress, payout history
- `/admin/clients` — All clients across all reps. Filterable by rep, type, status. Reassignment capability.
- `/admin/commissions` — Commission events table with approval workflow. Bulk approve, individual void. Filter by rep, period, status.
- `/admin/payouts` — Generate monthly payout summaries per rep. Mark as paid. Export to CSV for payment processing.
- `/admin/bonuses` — Quarterly bonus calculator. Shows each rep's progress toward bonus tiers. Run calculation at quarter-end. Approve and include in payouts.
- `/admin/settings` — Manage commission tiers, bonus thresholds (in case we adjust them later), add/deactivate reps

### Sales Rep Dashboard (`/dashboard/...`) — requires role = 'sales_rep'
- `/dashboard` — My overview: MTD earnings (sub + verif + bonus), active clients count, tier progress bar (e.g., "14/20 clients to Proven"), monthly earnings chart (last 12 months), next payout estimate
- `/dashboard/clients` — My clients list with subscription amount, verification count this month, commission earned this month, days remaining in commission window, status
- `/dashboard/earnings` — Detailed earnings breakdown: by client, by type (sub vs verif), by month. Running total. Comparison to prior months.
- `/dashboard/payouts` — My payout history with downloadable statements
- `/dashboard/bonuses` — My quarterly bonus progress: acquisition count vs tiers, verification volume vs tiers, retention rate vs tiers. Shows projected bonus at current pace.

---

## Stripe Integration

### Webhook Endpoints

Create an API route at `/api/webhooks/stripe` that handles these events:

**`invoice.payment_succeeded`**
1. Look up the `customer` ID → find matching client in our `clients` table
2. Check if client's `commission_end_date` has passed → if yes, skip commission (but still record payment for VryfID reporting)
3. Determine payment type from invoice line items:
   - Subscription line items → create `commission_events` record with `event_type = 'subscription'` and `commission_rate = client.commission_rate_locked`
   - Metered/usage line items (verifications) → create `commission_events` record with `event_type = 'verification'` and `commission_rate = 0.12`
4. Both types get `status = 'pending'` (require admin approval before payout)

**`customer.subscription.deleted`**
1. Update client status to 'churned'
2. Set `churned_date`
3. Commission events for this client stop (but existing pending/approved commissions are still payable)

**`charge.refunded`**
1. Find the commission_events linked to this charge
2. If refund is full: void the commission event entirely
3. If refund is partial: create an offsetting negative commission_event

**Webhook security:** Always verify the Stripe signature using `stripe.webhooks.constructEvent()`. Reject unverified payloads.

### Stripe Customer Metadata Convention

When a client is onboarded (either manually in the dashboard or via API), set these metadata fields on the Stripe Customer object:

```json
{
  "vryfid_sales_rep_id": "uuid-of-rep",
  "vryfid_client_type": "landlord_pm" | "brokerage",
  "vryfid_unit_count": "150",
  "vryfid_agent_count": "12",
  "vryfid_sign_date": "2026-04-15"
}
```

This allows us to reconcile Stripe data back to our system even if our database has issues.

### Data Sync (Daily Cron)

Create a daily job that:
1. Pulls all Stripe balance_transactions from the last 48 hours
2. Cross-references against commission_events to catch any missed webhooks
3. Logs discrepancies to a `sync_log` table for admin review

---

## Commission Calculation Logic (Pseudocode)

```
function calculateCommission(stripePayment, client, salesRep):
  
  // Check if still within commission window
  if today > client.commission_end_date:
    return null  // no commission owed
  
  // Determine rate based on event type
  if payment.type == 'subscription':
    rate = client.commission_rate_locked  // frozen at sign time
  else if payment.type == 'verification':
    rate = 0.12  // always 12%
  
  commission_amount = payment.amount * rate
  
  // Create commission event
  INSERT INTO commission_events (
    sales_rep_id: client.sales_rep_id,
    client_id: client.id,
    stripe_payment_id: payment.id,
    event_type: payment.type,
    payment_amount: payment.amount,
    commission_rate: rate,
    commission_amount: commission_amount,
    status: 'pending'
  )

function updateRepTier(salesRep):
  count = salesRep.lifetime_clients_signed
  
  if count >= 50:
    new_tier = 'elite'     // 35% on new clients
  else if count >= 20:
    new_tier = 'proven'    // 30% on new clients
  else:
    new_tier = 'starter'   // 25% on new clients
  
  // Tier only goes UP, never down
  if tierRank(new_tier) > tierRank(salesRep.current_tier):
    UPDATE sales_reps SET current_tier = new_tier WHERE id = salesRep.id

function onNewClientSigned(client, salesRep):
  // Increment lifetime count
  UPDATE sales_reps SET lifetime_clients_signed = lifetime_clients_signed + 1
  
  // Check for tier upgrade
  updateRepTier(salesRep)
  
  // Lock commission rate based on CURRENT tier (after potential upgrade)
  rate = tierToRate(salesRep.current_tier)  // 0.25, 0.30, or 0.35
  UPDATE clients SET commission_rate_locked = rate WHERE id = client.id
  
  // Set commission end date
  UPDATE clients SET commission_end_date = client.sign_date + INTERVAL '12 months'
```

### Quarterly Bonus Calculation (Run at Quarter End)

```
function calculateQuarterlyBonuses(quarter):
  for each active sales_rep:
    
    // Acquisition bonus
    new_clients = COUNT clients WHERE sales_rep_id = rep.id 
      AND sign_date WITHIN quarter
    acquisition_bonus = lookupAcquisitionTier(new_clients)
    
    // Volume bonus  
    total_verifs = SUM commission_events.payment_amount / verification_price
      WHERE sales_rep_id = rep.id 
      AND event_type = 'verification'
      AND period WITHIN quarter
    // OR count verification events directly
    volume_bonus = lookupVolumeTier(total_verifs)
    
    // Retention bonus (starts Q2)
    if quarter != first_quarter_of_rep:
      active_clients = clients still active from prior quarters
      churned_clients = clients churned this quarter
      retention_rate = active / (active + churned)
      retention_bonus = lookupRetentionTier(retention_rate)
    
    total = acquisition_bonus + volume_bonus + retention_bonus
    // Cap at $12,000
    total = MIN(total, 12000)
    
    INSERT INTO quarterly_bonuses (...)
```

---

## API Routes Summary

All API routes go in `app/api/...`:

```
POST   /api/webhooks/stripe          — Stripe webhook handler
GET    /api/admin/overview            — Dashboard KPIs (admin only)
GET    /api/admin/reps                — List all reps (admin only)
GET    /api/admin/reps/[id]           — Single rep detail (admin only)
POST   /api/admin/reps                — Create new rep (admin only)
PATCH  /api/admin/reps/[id]           — Update rep (admin only)
GET    /api/admin/clients             — List all clients (admin only)
POST   /api/admin/clients             — Add new client (admin only)
PATCH  /api/admin/clients/[id]        — Update client (admin only)
POST   /api/admin/clients/[id]/reassign — Reassign to different rep (admin only)
GET    /api/admin/commissions         — List commission events (admin only)
POST   /api/admin/commissions/approve — Bulk approve commissions (admin only)
POST   /api/admin/commissions/[id]/void — Void a commission (admin only)
GET    /api/admin/payouts             — List/generate payouts (admin only)
POST   /api/admin/payouts/generate    — Generate monthly payout (admin only)
POST   /api/admin/bonuses/calculate   — Run quarterly bonus calc (admin only)

GET    /api/dashboard/overview        — My KPIs (rep's own data via RLS)
GET    /api/dashboard/clients         — My clients (rep's own data via RLS)
GET    /api/dashboard/earnings        — My earnings breakdown (rep's own)
GET    /api/dashboard/payouts         — My payout history (rep's own)
GET    /api/dashboard/bonuses         — My bonus progress (rep's own)
```

---

## Build Order (Follow This Sequence)

### Phase 1: Foundation
1. Initialize Next.js 15 project with TypeScript, Tailwind, App Router
2. Install dependencies: `stripe`, `@clerk/nextjs`, `@supabase/supabase-js`, `@tremor/react`, shadcn/ui
3. Set up Clerk authentication with two roles: `admin` and `sales_rep`
4. Set up Supabase project, create all tables from schema above, apply RLS policies
5. Create middleware that checks Clerk role and routes to `/admin` or `/dashboard`
6. Build basic layout: sidebar nav, header with user info, role-based nav items

### Phase 2: Client & Rep Management (Admin)
7. Build `/admin/reps` — CRUD for sales reps. Form to add new rep (creates Clerk user invitation + database record)
8. Build `/admin/clients` — CRUD for clients. Form includes: company name, type, unit/agent count, subscription amount, assigned rep. On creation: sets `commission_rate_locked` based on rep's current tier, sets `commission_end_date` = sign_date + 12 months, increments rep's `lifetime_clients_signed`, checks for tier upgrade
9. Build `/admin/reps/[id]` — Rep detail view with their client roster and commission summary

### Phase 3: Stripe Webhook & Commission Engine
10. Build `/api/webhooks/stripe` — handle `invoice.payment_succeeded`, `customer.subscription.deleted`, `charge.refunded`
11. Implement commission calculation logic exactly as specified in pseudocode above
12. Build the daily sync cron job to catch missed webhooks
13. Test with Stripe test mode: create test customers, trigger test payments, verify commission records are created correctly

### Phase 4: Admin Commission Management
14. Build `/admin/commissions` — table of all commission events with filters (rep, date range, type, status). Bulk approve button. Individual void with reason.
15. Build `/admin/payouts` — generate monthly payout summary per rep (sums approved commissions + any approved bonuses). Mark as paid. CSV export.
16. Build `/admin/bonuses` — quarterly bonus calculator UI. Shows each rep's metrics vs bonus tiers. "Calculate Q[X] Bonuses" button runs the calculation. Review and approve.

### Phase 5: Admin Dashboard
17. Build `/admin` overview with KPI cards: Total MRR, Total Commission Expense, Commission-to-Revenue Ratio, Active Reps, Active Clients, Avg Revenue Per Client
18. Add Tremor charts: Revenue over time (area chart), Commission expense over time (stacked bar: sub + verif + bonus), Revenue by rep (bar chart), Client acquisition trend

### Phase 6: Sales Rep Dashboard
19. Build `/dashboard` — rep's own overview: MTD earnings, active client count, tier progress (X/20 to Proven or X/50 to Elite), monthly earnings trend chart
20. Build `/dashboard/clients` — rep's client list with per-client monthly commission, verification count, days remaining
21. Build `/dashboard/earnings` — detailed breakdown by client and type
22. Build `/dashboard/payouts` — payout history
23. Build `/dashboard/bonuses` — quarterly bonus progress with visual indicators

### Phase 7: Polish & Deploy
24. Add loading states, error boundaries, empty states for all pages
25. Add responsive design (reps will check on mobile)
26. Set up Vercel deployment with environment variables (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, etc.)
27. Configure Stripe webhook endpoint URL in Stripe dashboard pointing to production URL
28. Seed database with Gabe (admin), Aiden (admin), and one test rep

---

## Environment Variables Needed

```
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=https://ops.vryfid.com
```

---

## Coding Conventions

- Use TypeScript strict mode. No `any` types.
- Use Zod for all API input validation
- Use server actions for mutations where possible
- Use Suspense boundaries with loading.tsx files per route
- Error handling: try/catch on all API routes, return proper HTTP status codes
- Naming: PascalCase for components, camelCase for functions/variables, SCREAMING_SNAKE for env vars
- File structure: colocate page components in route folders, shared components in `components/`, shared types in `types/`, database queries in `lib/db/`, Stripe logic in `lib/stripe/`
- All money amounts stored as DECIMAL(10,2) in database, displayed with proper formatting ($X,XXX.XX)
- Dates: store as TIMESTAMPTZ in UTC, display in America/New_York timezone
- Use Supabase client with service role key in API routes (server-side only), anon key for client-side queries (respects RLS)

---

## What NOT to Build (Out of Scope for v1)

- No QuickBooks integration yet (we'll add this later as a sync layer)
- No direct Stripe customer creation from this dashboard (clients are onboarded in Stripe separately, then linked here)
- No email notifications (we'll add this in v2)
- No multi-currency support (USD only)
- No audit log (we'll add this in v2)
- No data export beyond CSV for payouts
- No custom reporting builder
