/**
 * User Interests API Route
 *
 * POST /api/user/interests - Add an interest
 * DELETE /api/user/interests - Remove an interest (interest in request body)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-client";
import { getServerDbClient } from "@/lib/db/server";
import { addInterest, removeInterest } from "@/lib/services/UserPreferencesService";
import type { ApiResponse } from "@/lib/api/types";
import type { DbUserPreference } from "@/lib/db/schema";
import { getUserPreferences, upsertUserPreferences } from "@/lib/db/queries";

/**
 * POST /api/user/interests
 *
 * Add an interest to user's preferences
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const body = await request.json();
    const { interest } = body as { interest: string };

    if (!interest || typeof interest !== "string") {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Interest is required",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Use server client with auth context for RLS
    const client = await getServerDbClient();
    const existing = await getUserPreferences(user.id, client);
    const interests = existing?.interests || [];

    // Avoid duplicates
    if (interests.includes(interest)) {
      const response: ApiResponse<DbUserPreference | null> = {
        success: true,
        data: existing || null,
      };
      return NextResponse.json(response);
    }

    const updated = await upsertUserPreferences(
      user.id,
      {
        interests: [...interests, interest],
        // Preserve existing data
        location_lat: existing?.location_lat,
        location_lng: existing?.location_lng,
        location_radius_km: existing?.location_radius_km,
        preferred_days: existing?.preferred_days,
        preferred_times: existing?.preferred_times,
      },
      client
    );

    const response: ApiResponse<DbUserPreference | null> = {
      success: true,
      data: updated,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error adding interest:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to add interest",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/user/interests
 *
 * Remove an interest from user's preferences (interest in request body)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const body = await request.json();
    const { interest } = body as { interest: string };

    if (!interest || typeof interest !== "string") {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Interest is required",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Use server client with auth context for RLS
    const client = await getServerDbClient();
    const existing = await getUserPreferences(user.id, client);

    if (!existing) {
      const response: ApiResponse<DbUserPreference | null> = {
        success: true,
        data: null,
      };
      return NextResponse.json(response);
    }

    const interests = existing.interests?.filter((i) => i !== interest) || [];

    const updated = await upsertUserPreferences(
      user.id,
      {
        interests,
        // Preserve existing data
        location_lat: existing.location_lat,
        location_lng: existing.location_lng,
        location_radius_km: existing.location_radius_km,
        preferred_days: existing.preferred_days,
        preferred_times: existing.preferred_times,
      },
      client
    );

    const response: ApiResponse<DbUserPreference | null> = {
      success: true,
      data: updated,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error removing interest:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove interest",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
