# Trailbill.com Setup Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account (https://supabase.com)
- Resend account (https://resend.com) - for email functionality
- Supabase CLI (optional, for local development)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_RESEND_API_KEY=re_your_resend_key
VITE_USE_MOCK_DATA=false
VITE_SITE_URL=http://localhost:5173
```

### 3. Supabase Setup

#### Option A: Use Existing Migrations

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration files in `supabase/migrations/` in order:
   - `001_Trailbill.com_tables.sql`
   - `002_commitment_system.sql`
   - `003_business_profiles.sql`
   - And so on...

#### Option B: Local Development with Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Start local Supabase
supabase start

# Apply migrations
supabase db push
```

### 4. Deploy Edge Functions (Optional)

Edge Functions handle email sending via Resend.

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy send-invoice
supabase functions deploy send-reminder

# Set secrets
supabase secrets set RESEND_API_KEY=re_your_key
supabase secrets set SITE_URL=https://your-domain.com
```

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:5173

## Development Modes

### Mock Data Mode (Default for Development)

Set in `.env`:
```env
VITE_USE_MOCK_DATA=true
```

This uses local mock data without requiring database connection. Perfect for:
- Frontend development
- UI/UX testing
- Demo purposes

### Production Mode

Set in `.env`:
```env
VITE_USE_MOCK_DATA=false
```

This connects to your Supabase database and uses real data.

## Database Schema

The application uses the following main tables:

- `clients` - Client information
- `invoices` - Invoice records
- `commitments` - Payment commitments from clients
- `communication_logs` - Email tracking
- `business_profiles` - User business settings

See `supabase/migrations/` for complete schema.

## Email Configuration

### Resend Setup

1. Sign up at https://resend.com
2. Verify your domain (or use test domain)
3. Get your API key
4. Add to `.env` as `VITE_RESEND_API_KEY`

### Email Templates

Email templates are handled by Edge Functions:
- `supabase/functions/send-invoice/` - Initial invoice emails
- `supabase/functions/send-reminder/` - Payment reminders

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run type-check
```

## Building for Production

```bash
# Build
npm run build

# Preview build
npm run preview
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Netlify

1. Push code to GitHub
2. Import project in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables

## Troubleshooting

### TypeScript Errors

If you see TypeScript errors about `import.meta.env`, ensure:
- `src/vite-env.d.ts` exists
- TypeScript server is restarted

### Database Connection Issues

1. Verify Supabase credentials in `.env`
2. Check Supabase project is active
3. Verify RLS policies are set correctly
4. Try mock data mode first: `VITE_USE_MOCK_DATA=true`

### Email Not Sending

1. Verify Resend API key
2. Check Edge Functions are deployed
3. Verify domain is verified in Resend
4. Check Supabase function logs

## Support

For issues or questions:
- Check existing documentation
- Review Supabase docs: https://supabase.com/docs
- Review Resend docs: https://resend.com/docs

## Next Steps

1. ✅ Set up environment variables
2. ✅ Run migrations
3. ✅ Deploy Edge Functions
4. ✅ Test with mock data
5. ✅ Switch to production mode
6. ✅ Configure email domain
7. ✅ Deploy to production
