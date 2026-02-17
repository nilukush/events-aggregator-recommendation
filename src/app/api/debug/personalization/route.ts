/**
 * Personalization Debug API
 * GET /api/debug/personalization
 *
 * Shows complete personalization data flow for the authenticated user:
 * - User preferences
 * - Existing recommendations
 * - Sample recommendation scores
 * - Events with match scores
 */

import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-client";
import { supabase } from "@/lib/supabase";
import { TABLES } from "@/lib/db/schema";
import { getRecommendationsForUser } from "@/lib/services/RecommendationEngine";
import { getUserPreferences } from "@/lib/db/queries";

export async function GET() {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "Not authenticated",
      });
    }

    // 1. Get user preferences
    const preferences = await getUserPreferences(user.id);

    // 2. Get existing recommendations
    const now = new Date().toISOString();
    const { data: existingRecommendations, error: recError } = await supabase
      .from(TABLES.RECOMMENDATIONS)
      .select("*")
      .eq("user_id", user.id)
      .gte("expires_at", now)
      .order("score", { ascending: false })
      .limit(10);

    // 3. Generate fresh recommendations (force refresh)
    let freshRecommendations = null;
    let generationError = null;

    try {
      const result = await getRecommendationsForUser(user.id, {
        limit: 10,
        forceRefresh: true,
      });
      freshRecommendations = result.recommendations;
    } catch (error) {
      generationError = error instanceof Error ? error.message : String(error);
    }

    // 4. Get sample events to see if they have coordinates
    const { data: sampleEvents } = await supabase
      .from(TABLES.EVENTS)
      .select("id, title, location_name, location_lat, location_lng, start_time")
      .gte("start_time", now)
      .limit(5);

    // 5. Check events with coordinates that might be wrong
    const { data: eventsWithCoords } = await supabase
      .from(TABLES.EVENTS)
      .select("id, title, location_name, location_lat, location_lng")
      .not("location_lat", "is", null)
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        preferences: preferences || null,
        existing_recommendations: existingRecommendations || [],
        fresh_recommendations: freshRecommendations || [],
        generation_error: generationError,
        sample_events: sampleEvents || [],
        events_with_coordinates: eventsWithCoords || [],
        diagnostics: {
          has_preferences: !!preferences,
          preferences_count: preferences ? Object.keys(preferences).length : 0,
          existing_recommendations_count: existingRecommendations?.length || 0,
          fresh_recommendations_count: freshRecommendations?.length || 0,
          events_with_coords_count: eventsWithCoords?.length || 0,
        },
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
