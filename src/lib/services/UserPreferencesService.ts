/**
 * User Preferences Service
 *
 * Service for managing user preferences and interactions
 * Handles:
 * - User interests and categories
 * - Location preferences
 * - Preferred days and times
 * - User event interactions (view, click, rsvp, hide, bookmark)
 */

import { supabase } from "../supabase";
import type {
  DbUserPreference,
  DbUserPreferenceInsert,
  DbUserPreferenceUpdate,
  DbUserInteraction,
  DbUserInteractionInsert,
} from "../db/schema";
import { TABLES } from "../db/schema";
import {
  getUserPreferences as getDbUserPreferences,
  upsertUserPreferences as upsertDbUserPreferences,
  getUserInteractions,
  getUserInteractionsForEvent as getDbUserInteractionsForEvent,
  recordInteraction as recordDbInteraction,
} from "../db/queries";
import type { PreferredDay, PreferredTime } from "../db/schema";

// Re-export types for convenience
export type { PreferredDay, PreferredTime };

/**
 * User preference data structure
 */
export interface UserPreferenceData {
  interests?: string[];
  location?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  preferredDays?: PreferredDay[];
  preferredTimes?: PreferredTime[];
}

/**
 * Result type for operations
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get user preferences
 */
export async function getUserPreferences(
  userId: string
): Promise<DbUserPreference | null> {
  return getDbUserPreferences(userId);
}

/**
 * Upsert user preferences
 */
export async function upsertUserPreferences(
  userId: string,
  data: UserPreferenceData
): Promise<DbUserPreference> {
  const preferences: DbUserPreferenceInsert = {
    user_id: userId,
    interests: data.interests,
    location_lat: data.location?.lat,
    location_lng: data.location?.lng,
    location_radius_km: data.location?.radiusKm,
    preferred_days: data.preferredDays,
    preferred_times: data.preferredTimes,
  };

  return upsertDbUserPreferences(userId, preferences);
}

/**
 * Update existing user preferences
 */
export async function updateUserPreferences(
  userId: string,
  data: Partial<UserPreferenceData>
): Promise<DbUserPreference | null> {
  const existing = await getUserPreferences(userId);
  if (!existing) {
    return null;
  }

  const updates: DbUserPreferenceUpdate = {};
  if (data.interests !== undefined) {
    updates.interests = data.interests;
  }
  if (data.location !== undefined) {
    updates.location_lat = data.location.lat;
    updates.location_lng = data.location.lng;
    updates.location_radius_km = data.location.radiusKm;
  }
  if (data.preferredDays !== undefined) {
    updates.preferred_days = data.preferredDays;
  }
  if (data.preferredTimes !== undefined) {
    updates.preferred_times = data.preferredTimes;
  }

  return upsertDbUserPreferences(userId, updates);
}

/**
 * Delete user preferences
 */
export async function deleteUserPreferences(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await (supabase
      .from(TABLES.USER_PREFERENCES) as any)
      .eq("user_id", userId)
      .delete();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Add an interest to user's preferences
 */
export async function addInterest(
  userId: string,
  interest: string
): Promise<DbUserPreference | null> {
  const existing = await getUserPreferences(userId);
  const interests = existing?.interests || [];

  // Avoid duplicates
  if (interests.includes(interest)) {
    return existing || null;
  }

  const data: UserPreferenceData = {
    interests: [...interests, interest],
  };
  if (existing && existing.location_lat !== null && existing.location_lng !== null) {
    data.location = {
      lat: existing.location_lat,
      lng: existing.location_lng,
      radiusKm: existing.location_radius_km || 25,
    };
  }
  if (existing?.preferred_days) {
    data.preferredDays = existing.preferred_days as PreferredDay[];
  }
  if (existing?.preferred_times) {
    data.preferredTimes = existing.preferred_times as PreferredTime[];
  }

  return upsertUserPreferences(userId, data);
}

/**
 * Remove an interest from user's preferences
 */
export async function removeInterest(
  userId: string,
  interest: string
): Promise<DbUserPreference | null> {
  const existing = await getUserPreferences(userId);
  if (!existing) {
    return null;
  }

  const interests = existing.interests?.filter((i) => i !== interest) || [];

  const data: UserPreferenceData = { interests };
  if (existing.location_lat !== null && existing.location_lng !== null) {
    data.location = {
      lat: existing.location_lat,
      lng: existing.location_lng,
      radiusKm: existing.location_radius_km || 25,
    };
  }
  if (existing.preferred_days) {
    data.preferredDays = existing.preferred_days as PreferredDay[];
  }
  if (existing.preferred_times) {
    data.preferredTimes = existing.preferred_times as PreferredTime[];
  }

  return upsertUserPreferences(userId, data);
}

/**
 * Set user's location preference
 */
export async function setLocationPreference(
  userId: string,
  location: { lat: number; lng: number; radiusKm: number }
): Promise<DbUserPreference | null> {
  const existing = await getUserPreferences(userId);

  const data: UserPreferenceData = { location };
  if (existing?.interests) {
    data.interests = existing.interests;
  }
  if (existing?.preferred_days) {
    data.preferredDays = existing.preferred_days as PreferredDay[];
  }
  if (existing?.preferred_times) {
    data.preferredTimes = existing.preferred_times as PreferredTime[];
  }

  return upsertUserPreferences(userId, data);
}

/**
 * Set user's preferred days
 */
export async function setPreferredDays(
  userId: string,
  days: PreferredDay[]
): Promise<DbUserPreference | null> {
  const existing = await getUserPreferences(userId);

  const data: UserPreferenceData = { preferredDays: days };
  if (existing?.interests) {
    data.interests = existing.interests;
  }
  if (existing && existing.location_lat !== null && existing.location_lng !== null) {
    data.location = {
      lat: existing.location_lat,
      lng: existing.location_lng,
      radiusKm: existing.location_radius_km || 25,
    };
  }
  if (existing?.preferred_times) {
    data.preferredTimes = existing.preferred_times as PreferredTime[];
  }

  return upsertUserPreferences(userId, data);
}

/**
 * Set user's preferred times
 */
export async function setPreferredTimes(
  userId: string,
  times: PreferredTime[]
): Promise<DbUserPreference | null> {
  const existing = await getUserPreferences(userId);

  const data: UserPreferenceData = { preferredTimes: times };
  if (existing?.interests) {
    data.interests = existing.interests;
  }
  if (existing && existing.location_lat !== null && existing.location_lng !== null) {
    data.location = {
      lat: existing.location_lat,
      lng: existing.location_lng,
      radiusKm: existing.location_radius_km || 25,
    };
  }
  if (existing?.preferred_days) {
    data.preferredDays = existing.preferred_days as PreferredDay[];
  }

  return upsertUserPreferences(userId, data);
}

/**
 * Record a user interaction with an event
 */
export async function recordInteraction(
  userId: string,
  eventId: string,
  interactionType: "view" | "click" | "rsvp" | "hide" | "bookmark",
  metadata?: Record<string, unknown>
): Promise<DbUserInteraction> {
  const interaction: DbUserInteractionInsert = {
    user_id: userId,
    event_id: eventId,
    interaction_type: interactionType,
    metadata: metadata || null,
  };

  return recordDbInteraction(interaction);
}

/**
 * Get all user interactions
 */
export async function getAllUserInteractions(
  userId: string
): Promise<DbUserInteraction[]> {
  return getUserInteractions(userId);
}

/**
 * Get user interactions for a specific event
 */
export async function getUserInteractionsForEvent(
  userId: string,
  eventId: string
): Promise<DbUserInteraction[]> {
  return getDbUserInteractionsForEvent(userId, eventId);
}

/**
 * Get user's bookmarked events
 */
export async function getBookmarkedEvents(
  userId: string
): Promise<DbUserInteraction[]> {
  const allInteractions = await getUserInteractions(userId);
  return allInteractions.filter((i) => i.interaction_type === "bookmark");
}

/**
 * Get user's hidden events
 */
export async function getHiddenEvents(
  userId: string
): Promise<DbUserInteraction[]> {
  const allInteractions = await getUserInteractions(userId);
  return allInteractions.filter((i) => i.interaction_type === "hide");
}

/**
 * Check if user has bookmarked an event
 */
export async function isEventBookmarked(
  userId: string,
  eventId: string
): Promise<boolean> {
  const interactions = await getUserInteractionsForEvent(userId, eventId);
  return interactions.some((i) => i.interaction_type === "bookmark");
}

/**
 * Check if user has hidden an event
 */
export async function isEventHidden(
  userId: string,
  eventId: string
): Promise<boolean> {
  const interactions = await getUserInteractionsForEvent(userId, eventId);
  return interactions.some((i) => i.interaction_type === "hide");
}

/**
 * Toggle bookmark on an event
 */
export async function toggleBookmark(
  userId: string,
  eventId: string
): Promise<{ bookmarked: boolean; interaction?: DbUserInteraction }> {
  const currentlyBookmarked = await isEventBookmarked(userId, eventId);

  if (currentlyBookmarked) {
    // Remove by recording a "bookmark" removal (we keep the history)
    // For now, we'll just return the current state
    return { bookmarked: false };
  }

  const interaction = await recordInteraction(userId, eventId, "bookmark");
  return { bookmarked: true, interaction };
}

/**
 * Hide an event from user's recommendations
 */
export async function hideEvent(
  userId: string,
  eventId: string
): Promise<DbUserInteraction> {
  return recordInteraction(userId, eventId, "hide");
}

/**
 * Unhide an event (remove hide interaction)
 */
export async function unhideEvent(
  userId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await (supabase
      .from(TABLES.USER_INTERACTIONS) as any)
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .eq("interaction_type", "hide")
      .delete();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
