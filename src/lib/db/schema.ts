/**
 * Database schema types matching Supabase tables
 * These types are generated from the database schema
 */

// ============================================
// Event Sources
// ============================================

export interface DbEventSource {
  id: string;
  name: string;
  slug: string;
  api_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EventSourceSlug = "eventbrite" | "meetup" | "luma" | "fractional-dubai";

// ============================================
// Events
// ============================================

export interface DbEvent {
  id: string;
  source_id: string;
  external_id: string;
  title: string;
  description: string | null;
  event_url: string;
  image_url: string | null;
  start_time: string; // ISO datetime
  end_time: string | null; // ISO datetime
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  is_virtual: boolean;
  category: string | null;
  tags: string[] | null;
  raw_data: Record<string, unknown> | null;
  embedding: number[] | null;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

// Event insert type (auto-generated fields excluded)
export interface DbEventInsert {
  source_id: string;
  external_id: string;
  title: string;
  description?: string | null;
  event_url: string;
  image_url?: string | null;
  start_time: string; // ISO datetime
  end_time?: string | null; // ISO datetime
  location_name?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  is_virtual?: boolean;
  category?: string | null;
  tags?: string[] | null;
  raw_data?: Record<string, unknown> | null;
  embedding?: number[] | null;
}

// ============================================
// User Preferences
// ============================================

export interface DbUserPreference {
  id: string;
  user_id: string;
  interests: string[] | null;
  location_lat: number | null;
  location_lng: number | null;
  location_radius_km: number | null;
  preferred_days: string[] | null;
  preferred_times: string[] | null;
  created_at: string;
  updated_at: string;
}

export type PreferredDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type PreferredTime = "morning" | "afternoon" | "evening";

export interface DbUserPreferenceInsert {
  user_id: string;
  interests?: string[] | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_radius_km?: number | null;
  preferred_days?: PreferredDay[] | null;
  preferred_times?: PreferredTime[] | null;
}

export type DbUserPreferenceUpdate = Partial<Omit<DbUserPreferenceInsert, "user_id">>;

// ============================================
// User Interactions
// ============================================

export type InteractionType = "view" | "click" | "rsvp" | "hide" | "bookmark";

export interface DbUserInteraction {
  id: string;
  user_id: string;
  event_id: string;
  interaction_type: InteractionType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DbUserInteractionInsert {
  user_id: string;
  event_id: string;
  interaction_type: InteractionType;
  metadata?: Record<string, unknown> | null;
}

// ============================================
// Recommendations
// ============================================

export type RecommendationAlgorithm = "content-based" | "collaborative" | "hybrid";

export interface DbRecommendation {
  id: string;
  user_id: string;
  event_id: string;
  score: number; // 0-1
  reason: string | null;
  algorithm: RecommendationAlgorithm | null;
  created_at: string;
  expires_at: string;
}

export interface DbRecommendationInsert {
  user_id: string;
  event_id: string;
  score: number;
  reason?: string | null;
  algorithm?: RecommendationAlgorithm | null;
  expires_at?: string; // Optional for inserts, defaults to NOW() + 7 days
}

// ============================================
// Query Parameters
// ============================================

export interface EventQueryParams {
  sourceId?: string;
  category?: string;
  isVirtual?: boolean;
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  location?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  limit?: number;
  offset?: number;
}

export interface NearbyEventsParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}

// ============================================
// Supabase Table Names
// ============================================

export const TABLES = {
  EVENT_SOURCES: "event_sources",
  EVENTS: "events",
  USER_PREFERENCES: "user_preferences",
  USER_INTERACTIONS: "user_interactions",
  RECOMMENDATIONS: "recommendations",
} as const;
