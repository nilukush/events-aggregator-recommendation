/**
 * Recommendation Engine
 *
 * Generates personalized event recommendations using:
 * - Content-based filtering: Matches events to user interests and preferences
 * - Collaborative filtering: Finds events liked by similar users
 * - Hybrid: Combines both approaches for better recommendations
 */

import {
  getEvents,
  getRecommendations,
  getRecommendationsWithEvents,
  upsertRecommendations,
  getUserPreferences,
  getUserInteractions,
  getUserInteractionsForEvent,
} from "../db/queries";
import type {
  DbEvent,
  DbUserPreference,
  DbUserInteraction,
  DbRecommendationInsert,
  RecommendationAlgorithm,
  DbRecommendation,
} from "../db/schema";
import { supabase } from "../supabase";
import { TABLES } from "../db/schema";
import { calculateDistance } from "../utils/location";

// ============================================
// Types
// ============================================

export interface RecommendationScore {
  eventId: string;
  score: number;
  reason: string;
  algorithm: RecommendationAlgorithm;
}

export interface RecommendationOptions {
  limit?: number;
  algorithm?: RecommendationAlgorithm;
  excludeSeen?: boolean;
  excludeBookmarked?: boolean;
  forceRefresh?: boolean;
}

export interface RecommendationResult {
  recommendations: (DbRecommendation & { event?: DbEvent })[];
  algorithm: RecommendationAlgorithm;
  generatedAt: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate time-based score decay
 * Events further in the future get higher scores
 */
function calculateTimeScore(eventTime: string): number {
  const now = new Date();
  const eventDate = new Date(eventTime);
  const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // Optimal: 1-7 days out
  if (daysUntilEvent >= 1 && daysUntilEvent <= 7) {
    return 1.0;
  }
  // Good: 7-14 days out
  if (daysUntilEvent > 7 && daysUntilEvent <= 14) {
    return 0.8;
  }
  // Okay: 14-30 days out
  if (daysUntilEvent > 14 && daysUntilEvent <= 30) {
    return 0.6;
  }
  // Less ideal: more than 30 days out
  if (daysUntilEvent > 30) {
    return 0.4;
  }
  // Past event: very low score
  return 0.1;
}

/**
 * Calculate distance score based on user location
 */
function calculateDistanceScore(
  event: DbEvent,
  userLat: number,
  userLng: number,
  radiusKm: number
): number {
  if (!event.location_lat || !event.location_lng) {
    return 0.5; // Neutral score for events without location
  }

  // Use shared distance calculation utility
  const distance = calculateDistance(event.location_lat, event.location_lng, userLat, userLng);

  // Score based on distance
  if (distance <= radiusKm * 0.25) {
    return 1.0; // Very close
  }
  if (distance <= radiusKm * 0.5) {
    return 0.8;
  }
  if (distance <= radiusKm) {
    return 0.6;
  }
  if (distance <= radiusKm * 1.5) {
    return 0.3;
  }
  return 0.1; // Too far
}

/**
 * Check if event matches user's preferred day/time
 */
function calculateDayTimeScore(
  event: DbEvent,
  preferredDays: string[] | null,
  preferredTimes: string[] | null
): number {
  const eventDate = new Date(event.start_time);
  const eventDay = eventDate
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const eventHour = eventDate.getHours();

  let score = 0.5; // Base score

  // Check day preference
  if (preferredDays && preferredDays.length > 0) {
    if (preferredDays.includes(eventDay)) {
      score += 0.25;
    } else {
      score -= 0.1;
    }
  }

  // Check time preference
  if (preferredTimes && preferredTimes.length > 0) {
    const isMorning = eventHour >= 6 && eventHour < 12;
    const isAfternoon = eventHour >= 12 && eventHour < 18;
    const isEvening = eventHour >= 18 && eventHour < 24;

    if (preferredTimes.includes("morning") && isMorning) {
      score += 0.25;
    }
    if (preferredTimes.includes("afternoon") && isAfternoon) {
      score += 0.25;
    }
    if (preferredTimes.includes("evening") && isEvening) {
      score += 0.25;
    }
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate interest match score
 */
function calculateInterestScore(
  event: DbEvent,
  userInterests: string[] | null
): number {
  if (!userInterests || userInterests.length === 0) {
    return 0.5; // Neutral score if no interests
  }

  const eventTags = event.tags || [];
  const eventCategory = event.category?.toLowerCase() || "";

  let matches = 0;
  for (const interest of userInterests) {
    const interestLower = interest.toLowerCase();
    if (eventTags.some((tag) => tag.toLowerCase() === interestLower)) {
      matches++;
    }
    if (eventCategory.includes(interestLower)) {
      matches++;
    }
  }

  // Score based on number of matches (normalized)
  return Math.min(1, 0.3 + matches * 0.35);
}

// ============================================
// Content-Based Filtering
// ============================================

/**
 * Generate recommendations based on user's interests and preferences
 */
async function contentBasedFiltering(
  userId: string,
  preferences: DbUserPreference,
  options: RecommendationOptions
): Promise<RecommendationScore[]> {
  const events = await getEvents();
  const userInteractions = await getUserInteractions(userId);
  const seenEventIds = new Set(userInteractions.map((i) => i.event_id));

  const scores: RecommendationScore[] = [];

  for (const event of events) {
    // Skip if already seen and excludeSeen is true
    if (options.excludeSeen && seenEventIds.has(event.id)) {
      continue;
    }

    let totalScore = 0;
    let scoreCount = 0;
    const reasons: string[] = [];

    // Interest matching
    if (preferences.interests && preferences.interests.length > 0) {
      const interestScore = calculateInterestScore(event, preferences.interests);
      totalScore += interestScore * 0.4; // 40% weight
      scoreCount++;
      if (interestScore > 0.5) {
        reasons.push("matches your interests");
      }
    }

    // Location preference
    if (
      preferences.location_lat !== null &&
      preferences.location_lng !== null &&
      preferences.location_radius_km !== null
    ) {
      const distanceScore = calculateDistanceScore(
        event,
        preferences.location_lat,
        preferences.location_lng,
        preferences.location_radius_km
      );
      totalScore += distanceScore * 0.3; // 30% weight
      scoreCount++;
      if (distanceScore > 0.6) {
        reasons.push("near your location");
      }
    }

    // Time preference
    const dayTimeScore = calculateDayTimeScore(
      event,
      preferences.preferred_days || null,
      preferences.preferred_times || null
    );
    totalScore += dayTimeScore * 0.2; // 20% weight
    scoreCount++;

    // Event time score
    const timeScore = calculateTimeScore(event.start_time);
    totalScore += timeScore * 0.1; // 10% weight
    scoreCount++;

    const finalScore = scoreCount > 0 ? totalScore : 0;

    if (finalScore > 0.1) {
      // Lower threshold from 0.3 to 0.1 - include more events with even weak matches
      scores.push({
        eventId: event.id,
        score: Math.min(1, finalScore),
        reason: reasons.length > 0 ? reasons.join(", ") : "recommended for you",
        algorithm: "content-based",
      });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, options.limit || 50); // Increase from 20 to 50
}

// ============================================
// Collaborative Filtering
// ============================================

/**
 * Generate recommendations based on similar users' interactions
 */
async function collaborativeFiltering(
  userId: string,
  options: RecommendationOptions
): Promise<RecommendationScore[]> {
  // Get user's interactions to understand their preferences
  const userInteractions = await getUserInteractions(userId);
  const seenEventIds = new Set(userInteractions.map((i) => i.event_id));

  if (userInteractions.length === 0) {
    // No interaction history, fall back to content-based
    return [];
  }

  // Find events the user interacted with positively (bookmarks, clicks, rsvps)
  const positiveInteractions = userInteractions.filter(
    (i) => i.interaction_type === "bookmark" || i.interaction_type === "rsvp" || i.interaction_type === "click"
  );

  if (positiveInteractions.length === 0) {
    return [];
  }

  // Find users who interacted with the same events
  const positiveEventIds = positiveInteractions.map((i) => i.event_id);

  // Get interactions for these events from other users
  const { data: similarUserInteractions } = await supabase
    .from(TABLES.USER_INTERACTIONS)
    .select("user_id, event_id, interaction_type")
    .in("event_id", positiveEventIds)
    .neq("user_id", userId);

  if (!similarUserInteractions || similarUserInteractions.length === 0) {
    return [];
  }

  // Calculate similarity scores for other users
  const userSimilarity = new Map<string, number>();
  const userEventInteractions = new Map<string, Set<string>>();

  for (const interaction of similarUserInteractions) {
    const otherUserId = interaction.user_id;

    if (!userSimilarity.has(otherUserId)) {
      userSimilarity.set(otherUserId, 0);
    }
    if (!userEventInteractions.has(otherUserId)) {
      userEventInteractions.set(otherUserId, new Set());
    }

    userEventInteractions.get(otherUserId)!.add(interaction.event_id);

    // Increment similarity score for each shared event interaction
    userSimilarity.set(
      otherUserId,
      userSimilarity.get(otherUserId)! + 1
    );
  }

  // Get all events interacted with by similar users
  const similarUserIds = Array.from(userSimilarity.keys());
  const { data: theirOtherEvents } = await supabase
    .from(TABLES.USER_INTERACTIONS)
    .select("event_id, user_id, interaction_type")
    .in("user_id", similarUserIds)
    .not("event_id", "in", `(${seenEventIds.size > 0 ? [...seenEventIds].join(",") : ""})`);

  if (!theirOtherEvents || theirOtherEvents.length === 0) {
    return [];
  }

  // Score events based on similar user interactions
  const eventScores = new Map<string, { score: number; reasons: string[] }>();

  for (const interaction of theirOtherEvents) {
    const eventId = interaction.event_id;
    const similarity = userSimilarity.get(interaction.user_id) || 0;

    if (!eventScores.has(eventId)) {
      eventScores.set(eventId, { score: 0, reasons: [] });
    }

    const current = eventScores.get(eventId)!;
    current.score += similarity;

    if (interaction.interaction_type === "bookmark") {
      current.score += 2;
    } else if (interaction.interaction_type === "rsvp") {
      current.score += 1.5;
    }

    if (current.reasons.length === 0) {
      current.reasons.push("popular with users like you");
    }
  }

  // Convert to recommendation scores
  const scores: RecommendationScore[] = [];
  for (const [eventId, data] of eventScores.entries()) {
    // Normalize score (max reasonable similarity is around 5-10)
    const normalizedScore = Math.min(1, data.score / 8);
    scores.push({
      eventId,
      score: normalizedScore,
      reason: data.reasons.join(", "),
      algorithm: "collaborative",
    });
  }

  // Sort by score
  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, options.limit || 20);
}

// ============================================
// Hybrid Approach
// ============================================

/**
 * Combine content-based and collaborative filtering
 */
async function hybridFiltering(
  userId: string,
  preferences: DbUserPreference,
  options: RecommendationOptions
): Promise<RecommendationScore[]> {
  const [contentScores, collabScores] = await Promise.all([
    contentBasedFiltering(userId, preferences, { ...options, limit: 50 }),
    collaborativeFiltering(userId, { ...options, limit: 50 }),
  ]);

  // Combine scores
  const combinedScores = new Map<string, RecommendationScore>();

  // Add content-based scores (60% weight)
  for (const score of contentScores) {
    combinedScores.set(score.eventId, {
      ...score,
      score: score.score * 0.6,
    });
  }

  // Add collaborative scores (40% weight)
  for (const score of collabScores) {
    const existing = combinedScores.get(score.eventId);
    if (existing) {
      // Combine scores
      existing.score = Math.min(1, existing.score + score.score * 0.4);
      existing.reason = `${existing.reason}, ${score.reason}`;
      existing.algorithm = "hybrid";
    } else {
      combinedScores.set(score.eventId, {
        ...score,
        score: score.score * 0.4,
      });
    }
  }

  // Convert to array and sort
  const scores = Array.from(combinedScores.values());
  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, options.limit || 20);
}

// ============================================
// Public API
// ============================================

/**
 * Get existing recommendations or generate new ones
 */
export async function getRecommendationsForUser(
  userId: string,
  options: RecommendationOptions = {}
): Promise<RecommendationResult> {
  const {
    limit = 20,
    algorithm = "hybrid",
    excludeSeen = true,
    excludeBookmarked = true,
    forceRefresh = false,
  } = options;

  // Check for existing valid recommendations
  if (!forceRefresh) {
    const existing = await getRecommendationsWithEvents(userId);
    if (existing.length > 0) {
      // Check if recommendations are still valid (not expired)
      const now = new Date();
      const validRecommendations = existing.filter((r) => new Date(r.expires_at) > now);

      if (validRecommendations.length >= Math.min(limit, existing.length)) {
        return {
          recommendations: validRecommendations.slice(0, limit),
          algorithm: validRecommendations[0].algorithm || "hybrid",
          generatedAt: new Date().toISOString(),
        };
      }
    }
  }

  // Generate new recommendations
  const preferences = await getUserPreferences(userId);
  const scores: RecommendationScore[] = [];

  if (algorithm === "hybrid" && preferences) {
    const hybridScores = await hybridFiltering(userId, preferences, options);
    scores.push(...hybridScores);
  } else if (algorithm === "collaborative") {
    const collabScores = await collaborativeFiltering(userId, options);
    scores.push(...collabScores);
  } else {
    // Default to content-based
    if (preferences) {
      const contentScores = await contentBasedFiltering(userId, preferences, options);
      scores.push(...contentScores);
    } else {
      // No preferences, just get upcoming events
      const events = await getEvents();
      for (const event of events.slice(0, limit || 20)) {
        scores.push({
          eventId: event.id,
          score: 0.5,
          reason: "upcoming event",
          algorithm: "content-based",
        });
      }
    }
  }

  // If no scores, return empty
  if (scores.length === 0) {
    return {
      recommendations: [],
      algorithm,
      generatedAt: new Date().toISOString(),
    };
  }

  // Create recommendation records
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

  const recommendations: DbRecommendationInsert[] = scores.map((s) => ({
    user_id: userId,
    event_id: s.eventId,
    score: s.score,
    reason: s.reason,
    algorithm: s.algorithm,
    expires_at: expiresAt.toISOString(),
  }));

  // Upsert recommendations
  await upsertRecommendations(recommendations);

  // Fetch with events
  const withEvents = await getRecommendationsWithEvents(userId);

  return {
    recommendations: withEvents.slice(0, limit),
    algorithm,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get personalized event feed for a user
 * Combines recommendations with recent events
 */
export async function getPersonalizedFeed(
  userId: string,
  options: RecommendationOptions = {}
): Promise<{
  recommended: (DbRecommendation & { event?: DbEvent })[];
  new: DbEvent[];
  algorithm: RecommendationAlgorithm;
}> {
  const recommendations = await getRecommendationsForUser(userId, {
    ...options,
    limit: 10,
  });

  // Get recent events not in recommendations
  const recEventIds = new Set(recommendations.recommendations.map((r) => r.event_id));
  const allEvents = await getEvents();
  const newEvents = allEvents
    .filter((e) => !recEventIds.has(e.id))
    .slice(0, options.limit || 20);

  return {
    recommended: recommendations.recommendations,
    new: newEvents,
    algorithm: recommendations.algorithm,
  };
}

/**
 * Record recommendation feedback
 * Used to improve future recommendations
 */
export async function recordRecommendationFeedback(
  userId: string,
  eventId: string,
  feedback: "helpful" | "not_helpful" | "dismissed"
): Promise<void> {
  // Record as a special interaction type
  const { error } = await supabase
    .from(TABLES.USER_INTERACTIONS)
    .insert({
      user_id: userId,
      event_id: eventId,
      interaction_type: "click", // Generic interaction for feedback
      metadata: { recommendation_feedback: feedback },
    });

  if (error) {
    console.error("Error recording recommendation feedback:", error);
  }
}

/**
 * Clear cached recommendations for a user
 * Forces regeneration on next request
 */
export async function clearUserRecommendations(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from(TABLES.RECOMMENDATIONS)
      .delete()
      .eq("user_id", userId);

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
