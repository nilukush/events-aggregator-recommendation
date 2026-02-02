/**
 * User Preferences API Route
 *
 * GET /api/user/preferences - Get user preferences
 * PUT /api/user/preferences - Update user preferences
 * DELETE /api/user/preferences - Delete user preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-client";
import { getServerDbClient } from "@/lib/db/server";
import { deleteUserPreferences } from "@/lib/services/UserPreferencesService";
import type { ApiResponse, UpdatePreferencesRequest } from "@/lib/api/types";
import type { DbUserPreference } from "@/lib/db/schema";
import {
  getUserPreferences as getDbUserPreferences,
  upsertUserPreferences,
} from "@/lib/db/queries";

/**
 * GET /api/user/preferences
 *
 * Get current user's preferences
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Use server client with auth context for RLS
    const client = await getServerDbClient();
    const preferences = await getDbUserPreferences(user.id, client);

    const response: ApiResponse<DbUserPreference | null> = {
      success: true,
      data: preferences,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching preferences:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch preferences",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/user/preferences
 *
 * Update user preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Use server client with auth context for RLS
    const client = await getServerDbClient();
    const body: UpdatePreferencesRequest = await request.json();

    // Update preferences based on what's provided
    let preferences = await getDbUserPreferences(user.id, client);

    // Build update object with only provided fields
    const updates: Partial<DbUserPreference> = {};

    if (body.location) {
      updates.location_lat = body.location.lat;
      updates.location_lng = body.location.lng;
      updates.location_radius_km = body.location.radiusKm;
    }

    if (body.preferred_days) {
      updates.preferred_days = body.preferred_days;
    }

    if (body.preferred_times) {
      updates.preferred_times = body.preferred_times;
    }

    if (body.interests) {
      updates.interests = body.interests;
    }

    // Only upsert if there are updates
    if (Object.keys(updates).length > 0) {
      preferences = await upsertUserPreferences(user.id, updates, client);
    }

    const response: ApiResponse<DbUserPreference | null> = {
      success: true,
      data: preferences,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating preferences:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update preferences",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/user/preferences
 *
 * Delete user preferences
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

    const result = await deleteUserPreferences(user.id);

    const response: ApiResponse = {
      success: result.success,
      error: result.error,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error deleting preferences:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete preferences",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
