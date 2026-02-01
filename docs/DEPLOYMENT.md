# EventNexus Deployment Guide

This guide covers deploying EventNexus to various platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Deployment Options](#deployment-options)
  - [Vercel (Recommended)](#vercel-recommended)
  - [Docker](#docker)
  - [Manual VPS](#manual-vps)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)

## Prerequisites

### Required Accounts

1. **Supabase** - Database and authentication
   - Create a project at [supabase.com](https://supabase.com)
   - Enable the following extensions:
     - `vector` (for pgvector embeddings)
     - `postgis` (for location queries)

2. **Event Source API Keys** (optional, for fetching events)
   - [Eventbrite API](https://www.eventbrite.com/platform/api)
   - [Meetup API](https://www.meetup.com/api/)
   - Luma API (contact Luma directly)
   - Fractional Dubai API (contact Fractional Dubai directly)

### Database Setup

Run the migration SQL in Supabase SQL Editor:

```sql
-- See src/db/migrations/ for complete schema
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Run all migration files in order
```

## Environment Variables

Create a `.env` file or configure in your deployment platform:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Event Source APIs (optional)
EVENTBRITE_API_KEY=your-eventbrite-key
EVENTBRITE_OAUTH_TOKEN=your-eventbrite-token
MEETUP_API_KEY=your-meetup-key
MEETUP_OAUTH_TOKEN=your-meetup-token
LUMA_API_KEY=your-luma-key
FRACTIONAL_DUBAI_API_KEY=your-fractional-dubai-key

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Deployment Options

### Vercel (Recommended)

Vercel provides the easiest deployment experience for Next.js.

#### Steps

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables**
   - Go to your project settings in Vercel dashboard
   - Add all environment variables from above

5. **Configure Custom Domain** (optional)
   - Add your custom domain in Vercel dashboard
   - Update DNS records as instructed

#### Automatic Deployments

Pushing to `main` branch will auto-deploy if you connect your GitHub repo.

### Docker

#### Build Image

```bash
docker build -t eventnexus:latest .
```

#### Run Container

```bash
docker run -d \
  --name eventnexus \
  -p 3000:3000 \
  --env-file .env \
  eventnexus:latest
```

#### Docker Compose (Recommended)

```bash
docker-compose up -d
```

#### Push to Registry

```bash
# Login
docker login

# Tag
docker tag eventnexus:latest yourusername/eventnexus:latest

# Push
docker push yourusername/eventnexus:latest
```

### Manual VPS

#### Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Node.js 22+
- PM2 process manager
- Nginx (optional, for reverse proxy)

#### Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/eventnexus.git
   cd eventnexus
   ```

2. **Install Dependencies**
   ```bash
   npm ci --production
   ```

3. **Build Application**
   ```bash
   npm run build
   ```

4. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env
   ```

5. **Start with PM2**
   ```bash
   pm2 start npm --name "eventnexus" -- start
   pm2 save
   pm2 startup
   ```

6. **Configure Nginx** (optional)

   Create `/etc/nginx/sites-available/eventnexus`:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/eventnexus /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

7. **Enable HTTPS with Certbot**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Post-Deployment

### 1. Verify Health Check

```bash
curl https://your-domain.com/api/health
```

Should return: `{"status":"ok"}`

### 2. Run Database Migrations

Execute all SQL migration files in Supabase SQL Editor in order:
- `001_initial_schema.sql`
- `002_events_tables.sql`
- `003_user_tables.sql`
- `004_rls_policies.sql`
- `005_functions.sql`

### 3. Enable Row Level Security (RLS)

Make sure RLS policies are correctly configured in Supabase.

### 4. Test Authentication

Visit `/auth/signin` and verify sign-in works with Supabase.

### 5. Ingest Initial Events

Run the ingestion service to populate events:

```bash
curl -X POST https://your-domain.com/api/ingest \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Monitoring

### Application Logs

**Vercel**: View logs in dashboard at `vercel.com`

**Docker**:
```bash
docker logs eventnexus -f
```

**PM2**:
```bash
pm2 logs eventnexus
```

### Health Monitoring

Set up uptime monitoring for:
- `GET /api/health` - Application health
- `GET /api/events` - Events API endpoint

### Error Tracking

Consider integrating:
- [Sentry](https://sentry.io) for error tracking
- [LogRocket](https://logrocket.com) for session replay
- [Vercel Analytics](https://vercel.com/analytics) for web analytics

## Troubleshooting

### Build Errors

- Ensure Node.js version is 22 or higher
- Clear cache: `rm -rf .next node_modules`
- Reinstall: `npm ci`

### Database Connection Errors

- Verify Supabase credentials in environment variables
- Check Supabase project is active
- Ensure IP restrictions allow your deployment server

### Events Not Loading

- Verify API keys are set
- Check ingestion service logs
- Run manual ingestion via API

### Authentication Issues

- Verify Supabase URL and keys
- Check RLS policies in Supabase
- Ensure email confirmation is enabled/disabled as desired

## Scaling

### Database Scaling

For high traffic:
- Enable Supabase connection pooling
- Consider read replicas for heavy read workloads
- Use Supabase Edge Functions for complex operations

### Caching Strategy

The application implements:
- API response caching (60s default)
- Static asset optimization via Next.js
- CDN distribution via Vercel Edge Network

### Load Balancing

For Docker/VPS deployments:
- Use multiple container instances behind Nginx
- Configure sticky sessions for WebSocket support
- Consider Kubernetes for orchestration
