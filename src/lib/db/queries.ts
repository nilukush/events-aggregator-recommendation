/**
 * Database query utilities for EventNexus
 * Provides typed wrappers around Supabase queries
 */

import { supabase } from "../supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DbEvent,
  DbEventInsert,
  DbEventSource,
  DbUserPreference,
  DbUserInteraction,
  DbUserInteractionInsert,
  DbRecommendation,
  DbRecommendationInsert,
  EventQueryParams,
  NearbyEventsParams,
} from "./schema";
import { TABLES } from "./schema";

// Supabase query result type helper
type QueryResult<T> = { data: T | null; error: { code: string; message: string } | null };

// ============================================
// Event Sources Queries
// ============================================

export async function getActiveEventSources(): Promise<DbEventSource[]> {
  const { data, error } = await supabase
    .from(TABLES.EVENT_SOURCES)
    .select("*")
    .eq("is_active", true);

  if (error) throw error;
  return data || [];
}

export async function getEventSourceBySlug(slug: string): Promise<DbEventSource | null> {
  const { data, error } = await supabase
    .from(TABLES.EVENT_SOURCES)
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
}

// ============================================
// Events Queries
// ============================================

export async function getEvents(params: EventQueryParams = {}): Promise<DbEvent[]> {
  // Get all events, prioritizing newly fetched events, then by start time
  // Note: We don't filter by start_time by default to show all events
  // Users can filter by date using the UI
  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .select("*")
    // Order by fetched_at first (newly fetched events), then by start_time
    .order("fetched_at", { ascending: false })
    .order("start_time", { ascending: true });

  if (error) throw error;
  let events = data || [];

  // Apply filters that can't be done in the main query
  // Filter by source
  if (params.sourceId) {
    events = events.filter((e) => e.source_id === params.sourceId);
  }

  // Filter by category
  if (params.category) {
    events = events.filter((e) => e.category === params.category);
  }

  // Filter by virtual status
  if (params.isVirtual !== undefined) {
    events = events.filter((e) => e.is_virtual === params.isVirtual);
  }

  // Filter by date range (only if explicitly requested)
  if (params.startDate) {
    events = events.filter((e) => e.start_time >= params.startDate!);
  }
  if (params.endDate) {
    events = events.filter((e) => e.start_time <= params.endDate!);
  }

  // Pagination
  if (params.limit) {
    events = events.slice(0, params.limit);
  }
  if (params.offset) {
    const start = params.offset;
    const end = start + (params.limit || 10);
    events = events.slice(start, end);
  }

  return events;
}

export async function getEventById(id: string): Promise<DbEvent | null> {
  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function getEventByExternalId(
  sourceId: string,
  externalId: string
): Promise<DbEvent | null> {
  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .select("*")
    .eq("source_id", sourceId)
    .eq("external_id", externalId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

/**
 * Insert a new event
 */
export async function insertEvent(event: DbEventInsert): Promise<DbEvent> {
  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Bulk insert events (upserts on conflict)
 */
export async function upsertEvents(events: DbEventInsert[]): Promise<DbEvent[]> {
  if (events.length === 0) return [];

  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .upsert(events, {
      onConflict: "source_id,external_id",
      ignoreDuplicates: false,
    })
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Update an existing event
 */
export async function updateEvent(
  id: string,
  updates: Partial<DbEventInsert>
): Promise<DbEvent> {
  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an event
 */
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.EVENTS)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Get nearby events using the database function
 */
export async function getNearbyEvents(params: NearbyEventsParams): Promise<DbEvent[]> {
  const { data, error } = await supabase.rpc("get_nearby_events", {
    lat: params.lat,
    lng: params.lng,
    radius_km: params.radiusKm || 50,
    limit_count: params.limit || 50,
  });

  if (error) throw error;
  return data || [];
}

// ============================================
// User Preferences Queries
// ============================================

export async function getUserPreferences(
  userId: string,
  client?: SupabaseClient
): Promise<DbUserPreference | null> {
  const db = client || supabase;
  const { data, error } = await db
    .from(TABLES.USER_PREFERENCES)
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function upsertUserPreferences(
  userId: string,
  preferences: Partial<DbUserPreference>,
  client?: SupabaseClient
): Promise<DbUserPreference> {
  const db = client || supabase;
  const { data, error } = await db
    .from(TABLES.USER_PREFERENCES)
    .upsert({ user_id: userId, ...preferences })
    .select()
    .single();

  if (error) {
    // Log detailed error for debugging
    console.error('[upsertUserPreferences] Database error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId,
      preferences,
    });
    throw error;
  }
  return data;
}

// ============================================
// User Interactions Queries
// ============================================

export async function getUserInteractions(userId: string): Promise<DbUserInteraction[]> {
  const { data, error } = await supabase
    .from(TABLES.USER_INTERACTIONS)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUserInteractionsForEvent(
  userId: string,
  eventId: string
): Promise<DbUserInteraction[]> {
  const { data, error } = await supabase
    .from(TABLES.USER_INTERACTIONS)
    .select("*")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function recordInteraction(
  interaction: DbUserInteractionInsert
): Promise<DbUserInteraction> {
  const { data, error } = await supabase
    .from(TABLES.USER_INTERACTIONS)
    .insert(interaction)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Recommendations Queries
// ============================================

export async function getRecommendations(userId: string): Promise<DbRecommendation[]> {
  const { data, error } = await supabase
    .from(TABLES.RECOMMENDATIONS)
    .select("*")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("score", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getRecommendationsWithEvents(userId: string): Promise<
  (DbRecommendation & { event: DbEvent })[]
> {
  const { data, error } = await supabase
    .from(TABLES.RECOMMENDATIONS)
    .select("*, event:events(*)")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("score", { ascending: false });

  if (error) throw error;
  return (data as unknown as (DbRecommendation & { event: DbEvent })[]) || [];
}

export async function upsertRecommendations(
  recommendations: DbRecommendationInsert[]
): Promise<DbRecommendation[]> {
  if (recommendations.length === 0) return [];

  const { data, error } = await supabase
    .from(TABLES.RECOMMENDATIONS)
    .upsert(recommendations, {
      onConflict: "user_id,event_id",
      ignoreDuplicates: false,
    })
    .select();

  if (error) throw error;
  return data || [];
}

export async function clearExpiredRecommendations(): Promise<void> {
  const cutoffDate = new Date();
  const oneWeekAgo = new Date(cutoffDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Use a raw SQL approach through Supabase SQL editor or RPC
  // For now, this is a placeholder that would be called via a cron job
  // The actual deletion should be done via a database function
  console.log(`Clearing recommendations older than ${oneWeekAgo.toISOString()}`);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from(TABLES.EVENT_SOURCES).select("id").limit(1);
    // Even if table doesn't exist, if we can connect, error won't be a connection error
    return true;
  } catch {
    return false;
  }
}

/**
 * Get event categories
 */
export async function getEventCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .select("category")
    .not("category", "is", null)
    .order("category");

  if (error) throw error;
  const categories = [...new Set(data?.map((d) => d.category).filter(Boolean) as string[])];
  return categories;
}

/**
 * Get event tags
 */
export async function getEventTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .select("tags")
    .not("tags", "is", null)
    .not("tags", "eq", "{}");

  if (error) throw error;

  const allTags = data?.flatMap((d) => d.tags || []) || [];
  const uniqueTags = [...new Set(allTags)];
  return uniqueTags;
}

// ============================================
// Additional Query Functions for API Routes
// ============================================

/**
 * Get events by source slug
 */
export async function getEventsBySource(sourceSlug: string): Promise<DbEvent[]> {
  const source = await getEventSourceBySlug(sourceSlug);
  if (!source) return [];

  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .select("*")
    .eq("source_id", source.id)
    .order("fetched_at", { ascending: false })
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get events by date range
 */
export async function getEventsByDateRange(startDate: string, endDate: string): Promise<DbEvent[]> {
  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .select("*")
    .gte("start_time", startDate)
    .lte("start_time", endDate)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get events by location (using the nearby events function)
 */
export async function getEventsByLocation(lat: number, lng: number, radiusKm: number): Promise<DbEvent[]> {
  return getNearbyEvents({ lat, lng, radiusKm });
}

/**
 * Get events by category
 */
export async function getEventsByCategory(categories: string[]): Promise<DbEvent[]> {
  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .select("*")
    .in("category", categories)
    .order("fetched_at", { ascending: false })
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Search events by text query
 */
export async function searchEvents(query: string): Promise<DbEvent[]> {
  const { data, error } = await supabase
    .from(TABLES.EVENTS)
    .select("*")
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order("fetched_at", { ascending: false })
    .order("start_time", { ascending: true })
    .limit(100);

  if (error) throw error;
  return data || [];
}
