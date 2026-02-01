/**
 * Recommendations API Route
 *
 * GET /api/recommendations - Get personalized event recommendations
 * DELETE /api/recommendations - Clear cached recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-client";
import {
  getRecommendationsForUser,
  getPersonalizedFeed,
  clearUserRecommendations,
  recordRecommendationFeedback,
} from "@/lib/services/RecommendationEngine";
import type { ApiResponse } from "@/lib/api/types";

/**
 * GET /api/recommendations
 *
 * Get personalized event recommendations
 *
 * Query params:
 * - limit: number of recommendations to return (default: 20)
 * - algorithm: "content-based" | "collaborative" | "hybrid" (default: "hybrid")
 * - feed: if "true", returns personalized feed with recommendations + new events
 * - refresh: if "true", forces regeneration of recommendations
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

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const algorithm = (searchParams.get("algorithm") || "hybrid") as "content-based" | "collaborative" | "hybrid";
    const asFeed = searchParams.get("feed") === "true";
    const forceRefresh = searchParams.get("refresh") === "true";

    if (asFeed) {
      const feed = await getPersonalizedFeed(user.id, {
        limit,
        algorithm,
        forceRefresh,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          recommended: feed.recommended,
          new: feed.new,
          algorithm: feed.algorithm,
          total: feed.recommended.length + feed.new.length,
        },
      };

      return NextResponse.json(response);
    }

    const result = await getRecommendationsForUser(user.id, {
      limit,
      algorithm,
      forceRefresh,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        recommendations: result.recommendations,
        algorithm: result.algorithm,
        generatedAt: result.generatedAt,
        total: result.recommendations.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching recommendations:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch recommendations",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/recommendations
 *
 * Clear cached recommendations
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

    const result = await clearUserRecommendations(user.id);

    if (!result.success) {
      const errorResponse: ApiResponse = {
        success: false,
        error: result.error || "Failed to clear recommendations",
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: "Recommendations cleared",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error clearing recommendations:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to clear recommendations",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/recommendations/feedback
 *
 * Record feedback on recommendations (to improve future suggestions)
 *
 * Body: { eventId: string, feedback: "helpful" | "not_helpful" | "dismissed" }
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

    const body = await request.json();
    const { eventId, feedback } = body as {
      eventId: string;
      feedback: "helpful" | "not_helpful" | "dismissed";
    };

    if (!eventId || !feedback) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "eventId and feedback are required",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const validFeedback = ["helpful", "not_helpful", "dismissed"];
    if (!validFeedback.includes(feedback)) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Invalid feedback value",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    await recordRecommendationFeedback(user.id, eventId, feedback);

    const response: ApiResponse = {
      success: true,
      data: {
        message: "Feedback recorded",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error recording feedback:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record feedback",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
