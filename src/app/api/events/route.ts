/**
 * Events API Route
 *
 * GET /api/events - List and filter events
 * Supports:
 * - Pagination (page, per_page)
 * - Filtering by source, date, location, categories, interests
 * - Full-text search
 * - Sorting by date, relevance, popularity
 * - User-specific filtering (bookmarked, hidden)
 * - Date/time preference filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-client";
import {
  getEvents,
  getEventsBySource,
  getEventsByDateRange,
  getEventsByLocation,
  getEventsByCategory,
  searchEvents,
} from "@/lib/db/queries";
import type {
  ApiResponse,
  EventFilters,
  EventListResponse,
  EventWithInteractions,
} from "@/lib/api/types";
import { isEventBookmarked, isEventHidden } from "@/lib/services/UserPreferencesService";

/**
 * Parse query parameters from request URL
 */
function parseFilters(searchParams: URLSearchParams): EventFilters {
  const filters: EventFilters = {};

  // Source filtering
  const sources = searchParams.get("sources");
  if (sources) {
    filters.sources = sources.split(",") as EventFilters["sources"];
  }

  // Date filtering
  const startDate = searchParams.get("start_date");
  if (startDate) {
    filters.start_date = startDate;
  }
  const endDate = searchParams.get("end_date");
  if (endDate) {
    filters.end_date = endDate;
  }

  // Location filtering
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius_km");
  if (lat && lng) {
    filters.lat = parseFloat(lat);
    filters.lng = parseFloat(lng);
    if (radius) {
      filters.radius_km = parseFloat(radius);
    }
  }

  // Category/interest filtering
  const categories = searchParams.get("categories");
  if (categories) {
    filters.categories = categories.split(",");
  }
  const interests = searchParams.get("interests");
  if (interests) {
    filters.interests = interests.split(",");
  }

  // Text search
  const query = searchParams.get("q");
  if (query) {
    filters.query = query;
  }

  // Pagination
  const page = searchParams.get("page");
  if (page) {
    filters.page = parseInt(page, 10);
  }
  const perPage = searchParams.get("per_page");
  if (perPage) {
    filters.per_page = Math.min(parseInt(perPage, 10), 100); // Max 100 per page
  }

  // Sorting
  const sortBy = searchParams.get("sort_by");
  if (sortBy) {
    filters.sort_by = sortBy as EventFilters["sort_by"];
  }
  const sortOrder = searchParams.get("sort_order");
  if (sortOrder) {
    filters.sort_order = sortOrder as EventFilters["sort_order"];
  }

  // Date/time preferences
  const preferredDays = searchParams.get("preferred_days");
  if (preferredDays) {
    filters.preferred_days = preferredDays.split(",") as EventFilters["preferred_days"];
  }
  const preferredTimes = searchParams.get("preferred_times");
  if (preferredTimes) {
    filters.preferred_times = preferredTimes.split(",") as EventFilters["preferred_times"];
  }

  // Interaction state
  const includeBookmarked = searchParams.get("bookmarked");
  if (includeBookmarked) {
    filters.include_bookmarked = includeBookmarked === "true";
  }
  const includeHidden = searchParams.get("hidden");
  if (includeHidden) {
    filters.include_hidden = includeHidden === "true";
  }

  return filters;
}

/**
 * GET /api/events
 *
 * Fetch and filter events with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseFilters(request.nextUrl.searchParams);
    const user = await getServerUser();

    // Start with base query
    let events = await getEvents();

    // Apply text search if provided
    if (filters.query) {
      const searchResults = await searchEvents(filters.query);
      events = searchResults;
    }

    // Filter by sources
    if (filters.sources && filters.sources.length > 0) {
      const bySource = await Promise.all(
        filters.sources.map((source) => getEventsBySource(source))
      );
      const sourceEventIds = new Set(
        bySource.flatMap((list) => list.map((e) => e.id))
      );
      events = events.filter((e) => sourceEventIds.has(e.id));
    }

    // Filter by date range
    if (filters.start_date || filters.end_date) {
      const startDate = filters.start_date
        ? new Date(filters.start_date)
        : new Date(0);
      const endDate = filters.end_date
        ? new Date(filters.end_date)
        : new Date("2099-12-31");
      events = events.filter((e) => {
        const eventDate = new Date(e.start_time);
        return eventDate >= startDate && eventDate <= endDate;
      });
    }

    // Filter by location
    if (filters.lat !== undefined && filters.lng !== undefined) {
      const locationEvents = await getEventsByLocation(
        filters.lat,
        filters.lng,
        filters.radius_km || 25
      );
      const locationEventIds = new Set(locationEvents.map((e) => e.id));
      events = events.filter((e) => locationEventIds.has(e.id));
    }

    // Filter by categories
    if (filters.categories && filters.categories.length > 0) {
      const categoryEvents = await getEventsByCategory(filters.categories);
      const categoryEventIds = new Set(categoryEvents.map((e) => e.id));
      events = events.filter((e) => categoryEventIds.has(e.id));
    }

    // Filter by interests (matches event tags or category)
    if (filters.interests && filters.interests.length > 0) {
      events = events.filter((event) => {
        const eventTags = event.tags || [];
        const eventCategory = event.category;
        return filters.interests!.some(
          (interest) =>
            eventTags.includes(interest) ||
            (eventCategory &&
              eventCategory.toLowerCase().includes(interest.toLowerCase()))
        );
      });
    }

    // Filter by user interactions (if authenticated)
    if (user) {
      // Filter out hidden events unless explicitly requested
      if (!filters.include_hidden) {
        const hiddenEventIds = new Set<string>();
        for (const event of events) {
          if (await isEventHidden(user.id, event.id)) {
            hiddenEventIds.add(event.id);
          }
        }
        events = events.filter((e) => !hiddenEventIds.has(e.id));
      }
    }

    // Sort events
    const sortBy = filters.sort_by || "date";
    const sortOrder = filters.sort_order || "asc";

    events.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison =
            new Date(a.start_time).getTime() -
            new Date(b.start_time).getTime();
          break;
        case "relevance":
          // Simple relevance: favor events matching more interests
          const aInterests = (a as any).interests_matched || 0;
          const bInterests = (b as any).interests_matched || 0;
          comparison = bInterests - aInterests;
          break;
        case "popularity":
          comparison = ((a as any).view_count || 0) - ((b as any).view_count || 0);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Pagination
    const page = filters.page || 1;
    const perPage = filters.per_page || 20;
    const total = events.length;
    const start = (page - 1) * perPage;
    const paginatedEvents = events.slice(start, start + perPage);

    // Enhance with user interaction state
    const enhancedEvents: EventWithInteractions[] = [];
    for (const event of paginatedEvents) {
      let eventWithInteractions: EventWithInteractions = { ...event };

      if (user) {
        eventWithInteractions.is_bookmarked = await isEventBookmarked(
          user.id,
          event.id
        );
        eventWithInteractions.is_hidden = await isEventHidden(user.id, event.id);
      }

      enhancedEvents.push(eventWithInteractions);
    }

    const response: ApiResponse<EventListResponse> = {
      success: true,
      data: {
        events: enhancedEvents,
        total,
        page,
        per_page: perPage,
        has_more: start + perPage < total,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching events:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch events",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
