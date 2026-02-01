/**
 * User Interests API Route
 *
 * POST /api/user/interests - Add an interest
 * DELETE /api/user/interests - Remove an interest (interest in request body)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-client";
import { addInterest, removeInterest } from "@/lib/services/UserPreferencesService";
import type { ApiResponse } from "@/lib/api/types";
import type { DbUserPreference } from "@/lib/db/schema";

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

    const preferences = await addInterest(user.id, interest);

    const response: ApiResponse<DbUserPreference | null> = {
      success: true,
      data: preferences,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error adding interest:", error);

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

    const preferences = await removeInterest(user.id, interest);

    const response: ApiResponse<DbUserPreference | null> = {
      success: true,
      data: preferences,
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
