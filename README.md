# EventNexus

Your unified event discovery platform. Aggregate events from Meetup, Eventbrite, Luma, and more with personalized recommendations.

## Overview

EventNexus solves the problem of fragmented event discovery by:
- **Aggregating events** from multiple platforms into a single feed
- **Providing personalized recommendations** based on your interests and preferences
- **Showing source attribution** so you know where each event came from
- **Plugin architecture** for easy addition of new event sources

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL + pgvector)
- **Authentication:** Supabase Auth
- **State Management:** Zustand
- **Testing:** Jest + React Testing Library + Playwright (E2E)
- **Icons:** Heroicons
- **Date Formatting:** date-fns

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd events-aggregator-recommendation
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API credentials:
- **Supabase:** Create a project at [supabase.com](https://supabase.com) and add your URL and anon key
- **Eventbrite:** Get API credentials from [Eventbrite Platform](https://www.eventbrite.com/platform/api-keys)
- **Meetup:** Get API credentials from [Meetup API](https://www.meetup.com/api/apps/)
- **Luma:** Get API key from [Luma Docs](https://docs.luma.com)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
npm run test         # Run unit/integration tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run E2E tests with Playwright
npm run test:e2e:ui  # Run E2E tests with UI
```

## Project Structure

```
eventnexus/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── events/            # Event pages
│   │   ├── recommendations/   # Recommendations page
│   │   └── preferences/       # User preferences page
│   ├── components/            # React components
│   │   ├── events/           # Event-related components
│   │   ├── preferences/      # Preferences components
│   │   └── ui/               # UI components
│   ├── lib/                  # Core libraries
│   │   ├── auth/            # Authentication utilities
│   │   ├── db/              # Database queries and schema
│   │   ├── plugins/         # Event source plugins
│   │   └── services/        # Business logic services
│   └── types/               # TypeScript type definitions
├── tests/                    # E2E tests
│   └── e2e/
├── public/                   # Static assets
└── docs/                     # Documentation
```

## Implementation Status

### Phase 1: Foundation (Complete)
- [x] Project foundation setup
- [x] Database schema design with pgvector support
- [x] Plugin system architecture
- [x] Eventbrite plugin implementation
- [x] Meetup plugin implementation
- [x] Event ingestion service
- [x] User authentication (Supabase Auth)
- [x] Row Level Security (RLS) policies

### Phase 2: Core Features (Complete)
- [x] User preferences management
- [x] Event feed API
- [x] Recommendation engine (content-based, collaborative, hybrid)
- [x] Frontend event feed UI
- [x] Event cards with filtering
- [x] User preferences UI (location, interests, time/day)

### Phase 3: Production Readiness (Complete)
- [x] E2E testing with Playwright
- [x] Docker containerization
- [x] CI/CD pipeline (GitHub Actions)
- [x] Deployment configuration (Vercel, Docker)
- [x] Deployment documentation

## Testing

The project includes comprehensive testing:

- **Unit Tests:** 155 tests covering plugins, services, and business logic
- **Integration Tests:** API route testing
- **E2E Tests:** Playwright tests for critical user flows

```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e
```

## Deployment

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

### Quick Deploy (Vercel)

```bash
npm i -g vercel
vercel --prod
```

### Docker Deploy

```bash
docker-compose up -d
```

## Architecture Highlights

### Plugin System

EventNexus uses a modular plugin architecture for event sources:

```typescript
interface EventSourcePlugin {
  source: string;
  name: string;
  fetchEvents(location?: LocationParams): Promise<Event[]>;
  validateConfig(): boolean;
}
```

### Recommendation Engine

Three-tier recommendation system:
1. **Content-Based:** Matches events to user interests
2. **Collaborative:** Similar users' preferences
3. **Hybrid:** Combines both for best results

### Database

- PostgreSQL with pgvector for semantic search
- Row Level Security for data isolation
- Optimized queries for location-based search

## Contributing

Contributions are welcome! Areas for contribution:
- Additional event source plugins
- UI/UX improvements
- Performance optimizations
- Documentation improvements

## License

MIT License - see LICENSE file for details.
