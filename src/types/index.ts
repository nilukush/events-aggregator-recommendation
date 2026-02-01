/**
 * Application types for EventNexus
 */

// Re-export database types
export * from "../lib/db/schema";

/**
 * Event source platform types
 */
export type EventSourceType = "eventbrite" | "meetup" | "luma" | "fractional-dubai" | "other";

/**
 * Geographic location
 */
export interface Location {
  name?: string;
  lat?: number;
  lng?: number;
  isVirtual: boolean;
}

/**
 * Normalized event structure from any source plugin
 */
export interface NormalizedEvent {
  id?: string; // Database ID (optional for new events)
  source: EventSourceType;
  externalId: string;
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  startTime: Date;
  endTime: Date | null;
  location: Location;
  category: string | null;
  tags: string[];
  rawData?: unknown;
}

/**
 * Event filters for fetching events
 */
export interface EventFilters {
  location?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  query?: string;
  virtualOnly?: boolean;
}

/**
 * Rate limit status from API
 */
export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetAt: Date | null;
  windowMs?: number; // Time window for rate limit in milliseconds
}

/**
 * Event source plugin interface
 */
export interface EventSourcePlugin {
  name: string;
  version: string;
  source: EventSourceType;
  healthCheck(): Promise<boolean>;
  getRateLimitStatus(): RateLimitStatus;
  fetchEvents(filters: EventFilters): Promise<NormalizedEvent[]>;
}

/**
 * API error types
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * User preferences for recommendations
 */
export interface UserPreferences {
  interests: string[];
  locationLat?: number;
  locationLng?: number;
  locationRadiusKm?: number;
  preferredDays?: PreferredDay[];
  preferredTimes?: PreferredTime[];
}

export type PreferredDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type PreferredTime = "morning" | "afternoon" | "evening";

/**
 * Recommendation result with event details
 */
export interface RecommendationWithEvent {
  id: string;
  score: number;
  reason: string | null;
  algorithm: RecommendationAlgorithm | null;
  event: {
    id: string;
    title: string;
    description: string | null;
    event_url: string;
    image_url: string | null;
    start_time: string;
    end_time: string | null;
    location_name: string | null;
    is_virtual: boolean;
    category: string | null;
    tags: string[] | null;
    source_name: string; // Joined from event_sources
  };
  expiresAt: string;
}

export type RecommendationAlgorithm = "content-based" | "collaborative" | "hybrid";

/**
 * Ingestion statistics
 */
export interface IngestionStats {
  source: string;
  successCount: number;
  errorCount: number;
  lastRunAt: Date;
  durationMs: number;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
