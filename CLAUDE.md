# EventNexus - Project Documentation

## Project Overview

**Product Name:** EventNexus

**Objective:** Build a unified event discovery and recommendation platform that aggregates events from multiple sources (Meetup, Eventbrite, Luma, etc.) and provides personalized recommendations based on user profiles.

## Architecture

**Pattern:** Modular Monolith with Plugin Architecture

This allows for:
- Simple deployment (single application)
- Clear module boundaries for future microservices extraction
- Plugin-based extensibility for new event sources

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL + pgvector + PostGIS + Auth) |
| State | Zustand |
| Hosting | Vercel (frontend) + Render (background worker) |

## Project Structure

```
eventnexus/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   ├── api/                      # API routes
│   │   │   ├── events/               # Events endpoints
│   │   │   ├── ingest/               # Event ingestion endpoints
│   │   │   ├── recommendations/      # Recommendation endpoints
│   │   │   └── user/                # User preferences endpoints
│   │   └── globals.css               # Global styles
│   ├── components/                   # React components
│   ├── lib/                          # Utilities
│   │   ├── supabase.ts               # Supabase client
│   │   ├── plugins/                  # Event source plugins
│   │   │   ├── BaseEventSourcePlugin.ts
│   │   │   ├── WebScraperPlugin.ts
│   │   │   ├── meetup/               # Meetup scraper
│   │   │   ├── luma/                  # Luma scraper
│   │   │   ├── eventbrite/           # Eventbrite scraper
│   │   │   ├── fractional-dubai/      # Fractional Dubai scraper
│   │   │   └── types.ts               # Plugin types
│   │   ├── services/                  # Business logic services
│   │   │   ├── EventIngestionService.ts
│   │   │   ├── UserPreferencesService.ts
│   │   │   └── RecommendationEngine.ts
│   │   └── db/                       # Database layer
│   │       ├── schema.ts              # Database type definitions
│   │       ├── queries.ts             # Database query functions
│   │       ├── converters.ts          # Type converters
│   │       └── index.ts               # Module exports
│   ├── types/                        # TypeScript types
│   │   └── index.ts                  # Core type definitions
│   └── __tests__/                    # Tests
│       └── integration/               # Integration tests
│       └── unit/                     # Unit tests
├── supabase/                         # Database migrations
│   └── migrations/
│       └── 001_initial_schema.sql    # Initial schema
├── public/                           # Static assets
├── .env.local                        # Environment variables (not committed)
├── .env.example                      # Environment template
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Dependencies and scripts
```

## Implementation Progress

### Step 1: Project Foundation ✅ COMPLETE

- [x] Initialize Next.js 16 project with TypeScript
- [x] Set up Supabase client configuration
- [x] Configure ESLint and testing infrastructure
- [x] Create folder structure
- [x] Verify setup with smoke tests

### Step 2: Database Schema Design ✅ COMPLETE

- [x] Create migration files
- [x] Define event_sources table
- [x] Define events table with pgvector + PostGIS support
- [x] Define user_preferences table
- [x] Define user_interactions table
- [x] Define recommendations table
- [x] Enable pgvector extension
- [x] Enable PostGIS extension for geospatial queries
- [x] Create database query functions
- [x] Create database integration tests
- [x] Verify type-checking and build

### Step 3: Plugin System Architecture ✅ COMPLETE

- [x] Define EventSourcePlugin interface
- [x] Create plugin registry
- [x] Implement base plugin class (BaseEventSourcePlugin)
- [x] Implement web scraper base class (WebScraperPlugin)
- [x] Add configurable rate limiting for scrapers

### Step 4: Event Platform Plugins ✅ COMPLETE

- [x] Eventbrite scraper plugin (web scraping)
- [x] Meetup scraper plugin (web scraping)
- [x] Luma scraper plugin (web scraping)
- [x] Fractional Dubai scraper plugin (web scraping)
- [x] Event Ingestion Service
- [x] API routes for event ingestion

### Step 5: Testing ✅ COMPLETE

- [x] All scraper plugins have unit tests
- [x] Database integration tests
- [x] 222 tests passing

## Database Schema

### Tables

#### event_sources
Stores metadata about event platforms (Eventbrite, Meetup, Luma, Fractional Dubai)

#### events
Normalized event data from all sources with:
- Vector embeddings for semantic search (pgvector)
- Location data for geospatial queries (PostGIS)
- Category and tags for filtering
- Raw data from source platform

#### user_preferences
User interests and location preferences for recommendations

#### user_interactions
Tracks user engagement with events (views, clicks, RSVPs, etc.)

#### recommendations
Cached recommendation scores for personalized feeds

### Key Features

- **pgvector extension**: Enabled for vector similarity search
- **PostGIS extension**: Enabled for accurate geospatial queries using WGS84 ellipsoid
- **Geospatial queries**: Using `ST_DWithin()` and `ST_Distance()` for nearby events
- **GiST indexes**: On geography columns for performant spatial queries
- **Row Level Security**: Enabled on user tables
- **Triggers**: Auto-update updated_at timestamps

## Database Setup Instructions

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Copy your project URL and anon key to `.env.local`

### 2. Enable PostGIS Extension

**Important:** PostGIS must be enabled before running the migration.

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Extensions**
3. Search for `postgis` and enable it
4. Click "Confirm" when prompted

### 3. Run Migration Files

Run the migration files in order:

```bash
# Via Supabase SQL Editor (Recommended)
# 1. Go to SQL Editor in Supabase dashboard
# 2. Copy contents of supabase/migrations/001_initial_schema.sql
# 3. Run the SQL
```

Or if using the CLI:
```bash
psql -h YOUR_PROJECT.supabase.co -U postgres -d postgres < supabase/migrations/001_initial_schema.sql
```

## API Platform Status

| Platform | Implementation | Notes |
|----------|---------------|-------|
| Eventbrite | ✅ Web Scraper | Location-based search via scraping |
| Meetup | ✅ Web Scraper | Location-based search via scraping |
| Luma | ✅ Web Scraper | City-based discovery (e.g., lu.ma/dubai) |
| Fractional Dubai | ✅ Web Scraper | Dubai-specific networking events |

**Note:** All platforms use web scraping instead of paid APIs to avoid subscription costs.

## Event Ingestion API

### Trigger Event Ingestion

```bash
# Ingest from all sources
curl -X POST "http://localhost:3000/api/ingest"

# Ingest from specific sources
curl -X POST "http://localhost:3000/api/ingest?sources=meetup,luma"

# Ingest with location filter (Dubai Marina)
curl -X POST "http://localhost:3000/api/ingest?city=Dubai"

# Ingest with custom location
curl -X POST "http://localhost:3000/api/ingest?location_lat=25.08&location_lng=55.14&radius_km=50"
```

### Get Ingestion Status

```bash
curl -X GET "http://localhost:3000/api/ingest"
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Note:** No API keys required for event sources - all use web scraping.

## Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Lint code
npm run type-check       # TypeScript check
npm run test             # Run tests
npm run test:watch       # Watch mode for tests
```

## Test Results

- **Test Suites:** 11 passed
- **Tests:** 222 passing

## Recent Updates

### UI/UX Improvements
- **Global Header**: Added consistent navigation across all pages (via root layout)
- **Account Page**: New `/account` page for user profile and preferences management
- **City Display**: Events now show city badges based on coordinates (40+ cities supported)
- **Simplified Navigation**: Removed redundant nav links for cleaner UX
- **City Detection Priority**: Coordinates are now checked first for city badges (more accurate), falling back to location name parsing
- **Debug Endpoint**: Enhanced `/api/debug/events` to return user preferences and recommendations for troubleshooting

### Bug Fixes (Jan 2026)
- **Duplicate Header Fixed**: Removed duplicate `<Header />` from account page - now uses global header from root layout only
- **Personalization Indicators Fixed**: Added `match_score` and `match_reasons` fields to `Event` interface in `PersonalizedEventList.tsx` - recommendation scores now display correctly on event cards when authenticated
- **City Badge Accuracy**: Improved city detection by prioritizing coordinate-based lookup over text parsing (fixes false positives like "Bangalore" on Dubai events)
- **Coordinate Fallback Fixed**: Removed automatic coordinate assignment from scraper filter - prevents incorrect coordinates (e.g., Berlin) from being assigned to Dubai events during scraping
- **Location Radius Filter**: Added hard location filter when recommendations are enabled - users now only see events within their specified radius (e.g., 100km around Dubai)
- **Shared Distance Utility**: Extracted Haversine distance calculation to `location.ts` for reuse across RecommendationEngine and Events API

### Personalization System
- **Recommendation Engine**: Content-based filtering with 4 factors:
  - Interest matching (40%): Compares user interests to event tags/category
  - Location proximity (30%): Distance-based scoring using Haversine formula
  - Day/time preferences (20%): Matches preferred days and time slots
  - Event timing (10%): Prioritizes upcoming events (1-7 days optimal)
- **Min Score Threshold**: 0.1 (includes events with weak matches)
- **Max Recommendations**: 50 events per request
- **Hard Location Filter**: When user has location preferences set, only events within their radius are shown (applied AFTER recommendation scoring)
- **Debug Logging**: Development mode logs recommendation count, location filter stats, and scoring details

### How Personalization Works

1. **Interest Matching**:
   - Checks event `tags` and `category` against user interests
   - Case-insensitive partial matching
   - Score: `0.3 + (matches × 0.35)` up to 1.0

2. **Location Scoring**:
   - Calculates distance using Haversine formula
   - Within 25% radius = 100%, within 50% = 80%, within radius = 60%
   - Events without location get neutral 50% score

3. **Day/Time Matching**:
   - Checks event day against `preferred_days`
   - Checks event hour against `preferred_times` (morning/afternoon/evening)
   - Base 50%, +25% for matches, -10% for non-matching days

4. **Final Score**:
   - Weighted sum of all factors
   - Events sorted by score (highest first)
   - Only events with score > 10% are shown

## Sources

- [PostGIS: Geo queries | Supabase Docs](https://supabase.com/docs/guides/database/extensions/postgis)
- [Supabase POSTGIS SQL function to return records within distance](https://stackoverflow.com/questions/77424611/supabase-postgis-sql-function-to-return-records-within-given-distance-from-user)
- [Supabase Documentation](https://supabase.com/docs)
