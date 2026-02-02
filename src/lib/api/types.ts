/**
 * API Types
 *
 * Shared types for API request and response bodies
 */

import type { DbEvent, DbUserPreference, DbUserInteraction } from "../db/schema";

/**
 * Common API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    has_more?: boolean;
  };
}

/**
 * Event filtering options
 */
export interface EventFilters {
  // Source filtering
  sources?: Array<"eventbrite" | "meetup" | "luma" | "fractional-dubai">;

  // Date filtering
  start_date?: string; // ISO date string
  end_date?: string;   // ISO date string

  // Location filtering
  lat?: number;
  lng?: number;
  radius_km?: number;
  city?: string; // For location-based scrapers that use city names

  // Category/interest filtering
  categories?: string[];
  interests?: string[];

  // Text search
  query?: string;

  // Pagination
  page?: number;
  per_page?: number;

  // Sorting
  sort_by?: "date" | "relevance" | "popularity";
  sort_order?: "asc" | "desc";

  // Date/time preferences
  preferred_days?: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday">;
  preferred_times?: Array<"morning" | "afternoon" | "evening">;

  // Interaction state (requires auth)
  include_bookmarked?: boolean;
  include_hidden?: boolean;

  // Recommendation engine
  use_recommendations?: boolean;
}

/**
 * Extended event type for API responses
 * Includes user interaction state when authenticated
 * and joined data from related tables
 */
export interface EventWithInteractions extends Omit<DbEvent, 'source_id'> {
  // Keep source_id for compatibility but add source_name
  source_id: string;
  // Joined from event_sources table
  source_name?: string;
  source_slug?: string;
  // User interaction state
  is_bookmarked?: boolean;
  is_hidden?: boolean;
  interaction_count?: number;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

/**
 * Event list response
 */
export interface EventListResponse {
  events: EventWithInteractions[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

/**
 * Event interaction request
 */
export interface EventInteractionRequest {
  interaction_type: "view" | "click" | "rsvp" | "hide" | "bookmark";
  metadata?: Record<string, unknown>;
}

/**
 * User preferences update request
 */
export interface UpdatePreferencesRequest {
  interests?: string[];
  location?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  preferred_days?: Array<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday">;
  preferred_times?: Array<"morning" | "afternoon" | "evening">;
}

/**
 * Bookmark toggle response
 */
export interface BookmarkToggleResponse {
  bookmarked: boolean;
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

/**
 * Source ingestion result
 */
export interface SourceIngestionResult {
  source: string;
  success: boolean;
  events_fetched: number;
  events_stored: number;
  errors: string[];
  duration_ms: number;
}

/**
 * Ingestion response
 */
export interface IngestionResponse {
  sources: SourceIngestionResult[];
  total_events_fetched: number;
  total_events_stored: number;
  total_errors: number;
  duration_ms: number;
}
