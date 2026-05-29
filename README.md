# LeadRadar

A full-stack lead intelligence CRM for finding small businesses with no website and managing the entire outreach process — from discovery to closed deal.

## What It Does

1. **Scan** public directories (Google Maps, Yelp, and 20+ platforms) for businesses with no website
2. **Score & rank** those businesses as leads (0–100 score based on reviews, ratings, platform presence)
3. **Call** them using the app as a reference tracker with live local time display
4. **Send demo websites** to interested prospects
5. **Collect commitment fees** and close deals

---

## Live App

**URL:** https://leadradar.cim-edge.com
**Hosted on:** Vercel (free tier)
**Database:** Supabase (free tier)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Email | Resend |
| Hosting | Vercel |

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- A Supabase account (free at supabase.com)
- A Resend account (free at resend.com)

### Steps

**1. Clone the repo**
```bash
git clone https://github.com/YOUR_USERNAME/leadradar.git
cd leadradar
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**

Copy the example file:
```bash
cp .env.example .env.local
```

Then fill in your values (see Environment Variables section below).

**4. Set up the database**

In your Supabase project, go to the SQL Editor and run the contents of `database/schema.sql`.

**5. Run the app**
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Environment Variables

Create a `.env.local` file with these values:

```bash
# Supabase (required — get from supabase.com > Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App URL
NEXT_PUBLIC_APP_URL=https://leadradar.cim-edge.com

# Cron job security (generate any random string)
CRON_SECRET=your-random-secret-here

# Email (get from resend.com/api-keys)
RESEND_API_KEY=re_...

# Google Places API (get from console.cloud.google.com)
GOOGLE_PLACES_API_KEY=AIza...

# Yelp (get from fusion.yelp.com)
YELP_API_KEY=...

# Apify (get from console.apify.com)
APIFY_API_TOKEN=apify_api_...

# Twilio SMS — optional (get from twilio.com/console)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Hunter.io phone enrichment — optional (get from hunter.io/api-keys)
HUNTER_API_KEY=...
```

> **Note:** Users can also enter their own API keys inside the app under Settings > API Keys.

---

## Running Without API Keys (Demo Mode)

The app runs in **demo mode** automatically when Supabase credentials are not set. In demo mode all pages load and are navigable with empty states — useful for previewing the UI.

---

## Deployment (Vercel)

Every push to `main` on GitHub triggers an automatic deployment.

### Manual deploy
```bash
vercel --prod
```

### Environment variables on Vercel
Set all variables from the section above in:
Vercel Dashboard > Your Project > Settings > Environment Variables

---

## Database Setup

Run the SQL in `database/schema.sql` inside your Supabase SQL Editor. It creates:

- `users` — extends Supabase auth
- `leads` — the main CRM table
- `scans` — scan history
- `call_logs` — call history per lead
- `reminders` — scheduled follow-ups
- `filter_presets` — saved scan filters
- `email_logs` — outreach history
- `audit_log` — action history

Row Level Security (RLS) is enabled on all tables — users can only see their own data.

---

## Features

- **New Scan** — Filter builder with 20+ platforms, business categories, location filters
- **CRM Dashboard** — Full leads table with sorting, filtering, bulk actions
- **Lead Detail Panel** — Call history, demo tracking, proposal management, reminders
- **Priority Queue** — Shows the best lead to call right now based on score and timezone
- **Analytics** — Pipeline funnel, calls per day, win rates, revenue forecast
- **DNC Compliance** — Automatic FTC Do Not Call Registry checks for US numbers
- **Time Zone Intelligence** — Live local time for every lead, colour-coded calling windows
- **Email Outreach** — Built-in templates with one-click send via Resend
- **Dark Mode** — Full dark/light mode toggle, remembers your preference
- **Export** — CSV and Excel export of all leads

---

## Folder Structure

```
leadradar/
├── app/                    # Next.js pages and API routes
│   ├── (auth)/             # Login, register, forgot password
│   ├── (dashboard)/        # All authenticated pages
│   └── api/                # Backend API routes
├── components/             # React components
│   ├── dashboard/          # CRM table, lead detail panel
│   ├── analytics/          # All chart components
│   ├── scan/               # Scan filter builder
│   └── layout/             # Sidebar, mobile nav
├── lib/                    # Utilities
│   ├── supabase/           # Database client
│   ├── scoring.ts          # Lead scoring algorithm
│   ├── timezone.ts         # Timezone utilities
│   └── dnc.ts              # DNC check logic
├── emails/                 # Email templates (React Email)
├── types/                  # TypeScript type definitions
└── middleware.ts           # Auth protection
```
