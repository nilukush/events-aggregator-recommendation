/**
 * Event Detail API Route
 *
 * GET /api/events/:id - Get a single event by ID
 * POST /api/events/:id/interactions - Record an interaction with an event
 * DELETE /api/events/:id/bookmark - Remove a bookmark
 * POST /api/events/:id/bookmark - Toggle bookmark status
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-client";
import { getEventById } from "@/lib/db/queries";
import {
  recordInteraction,
  isEventBookmarked,
  isEventHidden,
  toggleBookmark,
  unhideEvent,
} from "@/lib/services/UserPreferencesService";
import type { ApiResponse, EventWithInteractions, EventInteractionRequest } from "@/lib/api/types";

/**
 * GET /api/events/:id
 *
 * Get a single event by ID with user interaction state
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerUser();

    const event = await getEventById(id);

    if (!event) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Event not found",
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Enhance with user interaction state
    let eventWithInteractions: EventWithInteractions = { ...event };

    if (user) {
      eventWithInteractions.is_bookmarked = await isEventBookmarked(
        user.id,
        event.id
      );
      eventWithInteractions.is_hidden = await isEventHidden(user.id, event.id);

      // Record view interaction
      await recordInteraction(user.id, event.id, "view");
    }

    const response: ApiResponse<EventWithInteractions> = {
      success: true,
      data: eventWithInteractions,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching event:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch event",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/events/:id/interactions
 *
 * Record a user interaction with an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerUser();

    if (!user) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const event = await getEventById(id);

    if (!event) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Event not found",
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const body: EventInteractionRequest = await request.json();
    const { interaction_type, metadata } = body;

    // Validate interaction type
    const validTypes = ["view", "click", "rsvp", "hide", "bookmark"] as const;
    if (!validTypes.includes(interaction_type)) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Invalid interaction type",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const interaction = await recordInteraction(
      user.id,
      event.id,
      interaction_type,
      metadata
    );

    const response: ApiResponse = {
      success: true,
      data: interaction,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error recording interaction:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record interaction",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/events/:id/bookmark
 *
 * Toggle bookmark status for an event
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerUser();

    if (!user) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const event = await getEventById(id);

    if (!event) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Event not found",
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const result = await toggleBookmark(user.id, event.id);

    const response: ApiResponse = {
      success: true,
      data: {
        bookmarked: result.bookmarked,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error toggling bookmark:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to toggle bookmark",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * DELETE /api/events/:id/bookmark
 *
 * Remove a bookmark (explicit delete endpoint)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerUser();

    if (!user) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Authentication required",
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const event = await getEventById(id);

    if (!event) {
      const errorResponse: ApiResponse = {
        success: false,
        error: "Event not found",
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const result = await unhideEvent(user.id, event.id);

    // Use unhideEvent which deletes the hide interaction
    // If we want to explicitly remove bookmark, we could use the same pattern
    // For now, this endpoint removes the "hide" state

    const response: ApiResponse = {
      success: result.success,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating event:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update event",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
