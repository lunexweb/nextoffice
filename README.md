# NextOffice

**Get paid on time without the chase.** NextOffice automates payment follow-ups within relationship-friendly boundaries.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06b6d4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase&logoColor=white)

---

## Overview

NextOffice is a comprehensive invoice and client management platform for small businesses. It provides tools to manage clients, create and send invoices, track payments, monitor client reliability scores, and automate email communications — all from a single dashboard.

### Key Features

- **Invoice Management** — Create, preview, and send invoices with live PDF generation, VAT support, and flexible payment options (deposits, payment plans, extensions).
- **Client Management** — Full CRUD with reliability scoring, activity timelines, and contact management.
- **Automated Communications** — Email templates for invoices, reminders, follow-ups, and payment confirmations via Resend + Supabase Edge Functions.
- **Reliability Scoring** — Automatic 4-tier client scoring (Excellent / Good / Average / Poor) based on payment history.
- **CEO Dashboard** — High-level overview for business owners with user management.
- **Client Portal** — Public commitment pages where clients can choose payment options without logging in.
- **Dark Mode** — Full light/dark theme support.
- **PWA Ready** — Service worker and manifest for installable web app experience.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Language | TypeScript 5 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Backend | Supabase (Auth, Database, Edge Functions) |
| Email | Resend (via Supabase Edge Functions) |
| Animations | Framer Motion |
| Routing | React Router v6 |
| State | React Context + TanStack Query |
| PDF | jsPDF + jspdf-autotable |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/) 9+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/nextoffice.git
cd nextoffice
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_USE_MOCK_DATA=true          # Set to false for production
VITE_SITE_URL=http://localhost:5173
```

> **Tip:** Leave `VITE_USE_MOCK_DATA=true` to explore the app with sample data — no database setup required.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run type-check` | TypeScript type checking (no emit) |
| `npm test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |

---

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI primitives (shadcn/ui)
│   └── nextoffice/      # App-specific components
├── config/              # API and app configuration
├── contexts/            # React Context providers (Auth, Theme)
├── data/                # Mock data for development
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions (Supabase client, cn helper)
├── pages/               # Route-level page components
├── services/            # API service layer (email, clients, etc.)
├── templates/           # Email HTML templates
├── App.tsx              # Root component with routing
└── main.tsx             # Entry point
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Framework preset is auto-detected as **Vite**.
4. Add your environment variables in Vercel's dashboard.
5. Deploy — Vercel handles builds and SPA routing automatically via `vercel.json`.

### Environment Variables for Production

Set these in your hosting provider's dashboard:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Your Supabase anon/public key |
| `VITE_USE_MOCK_DATA` | No | Set to `false` for production |
| `VITE_RESEND_API_KEY` | No | Resend API key (for email features) |
| `VITE_SITE_URL` | No | Your production URL |

---

## Database Setup

Run the SQL migrations in `supabase/migrations/` in order against your Supabase project:

```bash
# With Supabase CLI
supabase db push
```

Or run each file manually via the Supabase SQL Editor. See [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) for detailed instructions.

---

## Documentation

Additional documentation is available in the [`docs/`](docs/) directory:

- [`SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) — Detailed setup and database configuration
- [`BUILD_PLAN.md`](docs/BUILD_PLAN.md) — Development roadmap and phase tracking
- [`DATA_TRANSITION_GUIDE.md`](docs/DATA_TRANSITION_GUIDE.md) — Migrating from mock to production data
- [`RESEND_INTEGRATION.md`](docs/RESEND_INTEGRATION.md) — Email service integration guide
- [`RESEND_COMPLETE_GUIDE.md`](docs/RESEND_COMPLETE_GUIDE.md) — Full Resend API reference

---

## License

This project is licensed under the [MIT License](LICENSE).
