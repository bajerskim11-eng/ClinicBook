# ClinicBook

An open-source clinic / appointment booking SaaS built with Next.js and
[Supabase](https://supabase.com). Bring your own free Supabase Cloud project
for auth + database, deploy the app to Vercel or anywhere that runs Docker.

**Repository:** [github.com/Servixa-cloud/ClinicBook](https://github.com/Servixa-cloud/ClinicBook)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Servixa-cloud/ClinicBook&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,NEXT_PUBLIC_APP_URL,ALLOWED_ORIGINS,CRON_SECRET,EMAIL_PROVIDER,RESEND_API_KEY,EMAIL_FROM)

> There is no "Deploy to Supabase" button — Supabase isn't an app host, it's
> your auth/database backend. The one-time setup step is **create a Supabase
> project** (see Quickstart below); the app itself runs on Vercel, Docker, or
> any Node.js host.

## Quickstart

### 1. Create a Supabase Cloud project

Go to [supabase.com/dashboard/new](https://supabase.com/dashboard/new) and
create a project. Once it's ready, grab these from **Project Settings > API**:

- Project URL
- `anon` / publishable key
- `service_role` key (server-only, keep secret)

### 2. Apply the database schema

This repo ships its schema as SQL migrations in `supabase/migrations/`.
Pick **one** of the options below.

#### Option A — Supabase CLI (recommended)

With the [Supabase CLI](https://supabase.com/docs/guides/cli) installed:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

#### Option B — Copy & paste in the Supabase SQL Editor

If you do not want to install the CLI, run each file **in filename order** in your
Supabase Dashboard under **SQL Editor > New query**. Open a migration file from
`supabase/migrations/`, paste the full contents, and click **Run** — repeat for
every file:

1. `00000000000000_baseline_schema.sql`
2. `20250321120000_seed_demo_clinic_ui_refresh.sql`
3. `20250322190000_patient_email_normalize_and_merge.sql`
4. `20250323120000_phase_10_practitioner_portal.sql`
5. `20250621120000_seed_demo_clinic_and_users.sql`
6. `20250622000000_clinic_branding_and_onboarding.sql`

Optional maintenance scripts (not part of the normal bootstrap) live in
`scripts/maintenance/` — only run those when you know you need them.

Either option creates all required tables, indexes, Row Level Security policies,
and the seeded **demo clinic** (`demo-clinic`).

### 3. Configure environment variables

```bash
cp .env.example .env.local   # for local dev (npm run dev)
# or
cp .env.example .env         # for Docker (docker compose)
```

Fill in the Supabase values from step 1. See the [Environment variables](#environment-variables)
table below for the full list.

### 4. Set up email (Resend)

Booking confirmations and reminders are sent by the app via
[Resend](https://resend.com). Supabase Auth's own emails (signup
confirmation, password reset, OTP) are sent by Supabase itself.

1. Create a [Resend](https://resend.com) account and API key.
2. Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=...`, and `EMAIL_FROM="Your Clinic <noreply@yourdomain.com>"`
   in your env file (`EMAIL_FROM` must use a domain verified in Resend).
3. **Supabase Auth emails**: in your Supabase Dashboard, go to
   **Authentication > Settings > SMTP**, enable custom SMTP, and enter:
   - Host: `smtp.resend.com`
   - Port: `465`
   - User: `resend`
   - Password: your Resend API key
   - Sender: same address as `EMAIL_FROM`

   This step matters — Supabase Cloud's built-in auth email is rate-limited
   to a few per hour on the free tier, which is fine for testing but not for
   real signups.

### 5. Deploy

**Option A — Vercel**: click the deploy button above, or import the repo at
[vercel.com/new](https://vercel.com/new) and set the env vars in the
dashboard. Vercel's native cron (`vercel.json`) handles scheduled jobs
automatically.

**Option B — Docker**:

```bash
docker compose up --build
```

`NEXT_PUBLIC_*` variables are baked into the client bundle at build time, so
`docker-compose.yml` passes them as build args from your `.env` file —
make sure `.env` is filled in before building.

### 6. Scheduled jobs (Docker / self-hosted only)

The app needs two endpoints called on a schedule: `/api/cron/reminders`
(hourly) and `/api/cron/cleanup-holds` (every 5 minutes), both authenticated
with a `CRON_SECRET` bearer token. `.github/workflows/cron.yml` does this via
GitHub Actions — set these repo secrets under **Settings > Secrets and
variables > Actions**:

- `APP_URL` — your deployed app's base URL
- `CRON_SECRET` — must match the `CRON_SECRET` env var on the app

(Skip this if deploying to Vercel — its built-in cron covers it.)

## Local development

```bash
npm install
npm run dev
```

For local email testing without a real provider, use
[Ethereal](https://ethereal.email) (fake SMTP, gives you a preview link
instead of sending real mail):

```bash
npm run setup-ethereal   # generates ETHEREAL_USER / ETHEREAL_PASS
# then set EMAIL_PROVIDER=ethereal in .env.local
```

## Verifying your setup

```bash
npm run check   # lint + production build
npm run dev     # in one terminal
npm run smoke   # in another — hits /, /auth/login, /book/demo-clinic, /dashboard
```

For a full pass: sign up a test patient (confirms Supabase Auth + Resend SMTP
deliver mail) and book an appointment against the seeded demo clinic
(confirms `sendConfirmationEmail` fires via the app's Resend integration).

## Demo clinic & login credentials

After migrations (step 2), a sample clinic is available for local testing:

| What | Value |
| --- | --- |
| Public booking page | `/book/demo-clinic` |
| Clinic name | Harbourview Wellness Clinic |

Seeded staff accounts (password for both: **`DemoClinic123!`**):

| Role | Email | Login URL |
| --- | --- | --- |
| Admin (dashboard) | `admin@harbourviewwellness.demo` | `/auth/login` |
| Practitioner portal | `sarah.chen@harbourviewwellness.demo` | `/auth/login` |

The demo admin is flagged to **change password on first login** — you will be
redirected to `/auth/first-login` before reaching the dashboard. Use a new
password of at least 8 characters.

> These accounts are for **local development and demos only**. Change or remove
> them before going to production (see `supabase/migrations/20250621120000_seed_demo_clinic_and_users.sql`).

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | From Supabase Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon or publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` also work) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only, never expose to the client |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL of your deployment |
| `ALLOWED_ORIGINS` | yes | Comma-separated CORS allowlist |
| `CRON_SECRET` | yes (production) | Bearer token required by `/api/cron/*` |
| `EMAIL_PROVIDER` | yes | `resend` (production) or `ethereal` (dev) |
| `RESEND_API_KEY` | if `EMAIL_PROVIDER=resend` | From resend.com |
| `EMAIL_FROM` | if `EMAIL_PROVIDER=resend` | Must be a verified Resend sender/domain |
| `ETHEREAL_USER` / `ETHEREAL_PASS` | if `EMAIL_PROVIDER=ethereal` | Generated by `npm run setup-ethereal` |
| `SMS_PROVIDER` | no | `console` (default) logs instead of sending — no real SMS provider is wired up yet |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | no | Billing is not implemented yet; reserved for future use |
| `CALENDAR_SYNC_ENABLED` | no | Feature flag, disabled by default |

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/app/` | Next.js App Router pages (public booking, staff dashboard, patient portal, API routes) |
| `src/components/` | Shared UI components (shadcn/ui) |
| `src/lib/` | Supabase clients, validation, email, availability engine |
| `supabase/migrations/` | Database schema + demo seed (run in order — see step 2) |
| `scripts/` | `smoke-http.mjs`, `setup-ethereal.ts`, maintenance SQL |
| `.env.example` | Template for all supported environment variables |
| `docker-compose.yml` / `Dockerfile` | Self-hosted Docker deployment |
| `vercel.json` | Vercel cron schedule for reminders and hold cleanup |
| `.github/workflows/cron.yml` | GitHub Actions cron for non-Vercel hosts |

## License

[MIT](./LICENSE)

---

**By [Servixa.cloud](https://github.com/Servixa-cloud)**
