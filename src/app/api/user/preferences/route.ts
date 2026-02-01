/**
 * User Preferences API Route
 *
 * GET /api/user/preferences - Get user preferences
 * PUT /api/user/preferences - Update user preferences
 * DELETE /api/user/preferences - Delete user preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-client";
import {
  getUserPreferences,
  updateUserPreferences,
  deleteUserPreferences,
  addInterest,
  removeInterest,
  setLocationPreference,
  setPreferredDays,
  setPreferredTimes,
} from "@/lib/services/UserPreferencesService";
import type { ApiResponse, UpdatePreferencesRequest } from "@/lib/api/types";
import type { DbUserPreference } from "@/lib/db/schema";

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

    const preferences = await getUserPreferences(user.id);

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

    const body: UpdatePreferencesRequest = await request.json();

    // Update preferences based on what's provided
    let preferences = await getUserPreferences(user.id);

    if (body.interests) {
      preferences = await updateUserPreferences(user.id, {
        interests: body.interests,
      });
    }

    if (body.location) {
      preferences = await setLocationPreference(user.id, body.location);
    }

    if (body.preferred_days) {
      preferences = await setPreferredDays(user.id, body.preferred_days);
    }

    if (body.preferred_times) {
      preferences = await setPreferredTimes(user.id, body.preferred_times);
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
