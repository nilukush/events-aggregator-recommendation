# Deployment Guide - EventNexus

This guide covers deploying EventNexus to production using Vercel (frontend) and GitHub Actions (scheduled event ingestion).

## Prerequisites

1. A Supabase project with the database migrations applied
2. A GitHub repository with the code
3. A Vercel account

## Architecture

- **Frontend**: Vercel (Next.js App Router)
  - Hosts the web application and API routes
  - URL: `https://events-aggregator-recommendation.vercel.app`

- **Scheduled Event Ingestion**: GitHub Actions (FREE)
  - Runs every hour to fetch events from sources
  - Calls the `/api/ingest` endpoint
  - Unlimited free minutes for public repositories

## Environment Variables

### Vercel (Frontend)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key | `sb_publishable_xxx` |

### GitHub Secrets (for Scheduled Ingestion)

| Secret | Description | Example |
|--------|-------------|---------|
| `INGEST_URL` | URL of the ingest endpoint | `https://events-aggregator-recommendation.vercel.app/api/ingest` |
| `CITY` | Default city for events | `Dubai` |
| `LAT` | Default latitude | `25.2048` |
| `LNG` | Default longitude | `55.2708` |
| `RADIUS_KM` | Search radius in km | `50` |
| `SUPABASE_URL` | Supabase project URL (fallback) | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase publishable key (fallback) | `sb_publishable_xxx` |

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

### 3. Configure GitHub Actions for Scheduled Ingestion

Since your repository is **public**, GitHub Actions provides **unlimited free minutes**!

#### Step 3.1: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:
   - `INGEST_URL`: `https://events-aggregator-recommendation.vercel.app/api/ingest`
   - `CITY`: `Dubai`
   - `LAT`: `25.2048`
   - `LNG`: `55.2708`
   - `RADIUS_KM`: `50`

#### Step 3.2: Enable the Workflow

The workflow file is already at `.github/workflows/event-ingestion.yml`

1. Go to **Actions** tab in your GitHub repository
2. Click on **Event Ingestion** workflow
3. Click **Enable workflow**

The workflow will automatically run **every hour** at the top of the hour.

### 4. Trigger a Manual Run (Optional)

To test the workflow immediately:

1. Go to **Actions** tab
2. Click **Event Ingestion**
3. Click **Run workflow** → **Run workflow**

### 5. Verify Deployment

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
- **GitHub Actions**: Check workflow runs at https://github.com/nilukush/events-aggregator-recommendation/actions
- **Supabase**: Monitor database at https://supabase.com/dashboard

## Free Hosting Summary

| Service | Tier | Cost | Limits |
|---------|------|------|--------|
| **Vercel** | Hobby | FREE | Sufficient for this project |
| **GitHub Actions** | Public Repo | FREE | Unlimited minutes |
| **Supabase** | Free Tier | FREE | 500MB database, 50K MAU |

**Total Monthly Cost: $0**

## Alternative: cron-job.org (External Service)

If you prefer an even simpler approach, you can use [cron-job.org](https://cron-job.org/) which is completely free:

1. Create an account at https://cron-job.org
2. Create a new cron job
3. Set URL to: `https://events-aggregator-recommendation.vercel.app/api/ingest?city=Dubai`
4. Set execution to every hour
5. Save

**Pros:** No GitHub configuration needed
**Cons:** External dependency, less logging

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

### GitHub Actions Not Running

- Verify workflow is enabled in Actions tab
- Check schedule syntax: `0 * * * *` (hourly)
- Check GitHub Secrets are configured correctly
- View workflow logs for detailed error messages

## Next Steps

1. Set up custom domains
2. Configure error tracking (Sentry, etc.)
3. Set up analytics
4. Add authentication for user-specific features
