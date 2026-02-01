# Deployment Guide - EventNexus

This guide covers deploying EventNexus to production using Vercel (frontend) and Render (background worker).

## Prerequisites

1. A Supabase project with the database migrations applied
2. A GitHub repository with the code
3. Accounts on Vercel and Render

## Architecture

- **Frontend**: Vercel (Next.js App Router)
  - Hosts the web application and API routes
  - URL: `https://events-aggregator-recommendation.vercel.app`

- **Background Worker**: Render (Cron Worker)
  - Periodically fetches events from sources and stores in database
  - Runs every hour by default

## Environment Variables

### Vercel (Frontend)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key | `sb_publishable_xxx` |

### Render (Background Worker)

| Variable | Description | Example |
|----------|-------------|---------|
| `INGEST_URL` | URL of the ingest endpoint | `https://events-aggregator-recommendation.vercel.app/api/ingest` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase publishable key | `sb_publishable_xxx` |
| `CITY` | Default city for events | `Dubai` |
| `LAT` | Default latitude | `25.2048` |
| `LNG` | Default longitude | `55.2708` |
| `RADIUS_KM` | Search radius in km | `50` |

## Deployment Steps

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
npx vercel --prod
```

Or use the Vercel dashboard:
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Add environment variables
4. Deploy

### 2. Set Environment Variables on Vercel

```bash
# Add Supabase URL
echo "https://your-project.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production

# Add Supabase Anon Key
echo "sb_publishable_your_key" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

### 3. Deploy to Render

Option A: Using render.yaml (Blueprint)

1. Go to https://dashboard.render.com/blueprints
2. Connect your GitHub repository
3. Review the configuration in `render.yaml`
4. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `INGEST_URL` (your Vercel deployment URL)
5. Deploy

Option B: Manual Deployment

1. Go to https://dashboard.render.com
2. Create a new "Cron Job"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `eventnexus-worker`
   - **Region**: Singapore (or closest to your users)
   - **Branch**: `main`
   - **Runtime**: `Node 20`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run worker`
   - **Cron Schedule**: `0 * * * *` (every hour)
5. Add environment variables (see table above)
6. Deploy

### 4. Verify Deployment

Test the frontend:
```bash
curl https://events-aggregator-recommendation.vercel.app/api/health
```

Test the ingest endpoint:
```bash
curl -X POST https://events-aggregator-recommendation.vercel.app/api/ingest?city=Dubai
```

## Database Setup

Apply migrations in your Supabase SQL editor:

1. Run `001_initial_schema.sql`
2. (Optional) Run `002_sample_data.sql` for testing

## Monitoring

- **Vercel**: Check logs at https://vercel.com/dashboard
- **Render**: Check logs at https://dashboard.render.com
- **Supabase**: Monitor database at https://supabase.com/dashboard

## Local Testing

Run the worker locally:

```bash
# Set environment variables
export INGEST_URL=http://localhost:3000/api/ingest
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=sb_publishable_your_key

# Run the worker
npm run worker
```

## Troubleshooting

### Build Failures

- Check `npm run build` passes locally first
- Verify all dependencies are in `package.json`

### Runtime Errors

- Check environment variables are set correctly
- Verify Supabase migrations have been applied
- Check API endpoints are accessible

### Worker Not Running

- Verify Render cron schedule is correct
- Check worker logs in Render dashboard
- Ensure INGEST_URL points to correct Vercel deployment

## Next Steps

1. Set up custom domains
2. Configure error tracking (Sentry, etc.)
3. Set up analytics
4. Add authentication for user-specific features
