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
 * - Includes source_name from event_sources join
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-client";
import { supabase } from "@/lib/supabase";
import { TABLES } from "@/lib/db/schema";
import type { DbEvent } from "@/lib/db/schema";
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

  // Location filtering by city name
  const city = searchParams.get("city");
  if (city && city !== "All Cities") {
    // City name coordinates mapping
    const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
      "Dubai": { lat: 25.2048, lng: 55.2708 },
      "Abu Dhabi": { lat: 24.4539, lng: 54.3773 },
      "Sharjah": { lat: 25.3467, lng: 55.4097 },
      "Riyadh": { lat: 24.7136, lng: 46.6753 },
      "Doha": { lat: 25.2854, lng: 51.5310 },
      "Kuwait City": { lat: 29.3759, lng: 47.9774 },
      "Manama": { lat: 26.0667, lng: 50.5577 },
      "Muscat": { lat: 23.5859, lng: 58.3849 },
      "Jeddah": { lat: 21.5433, lng: 39.1728 },
      "Singapore": { lat: 1.3521, lng: 103.8198 },
      "London": { lat: 51.5074, lng: -0.1278 },
      "New York": { lat: 40.7128, lng: -74.0060 },
      "San Francisco": { lat: 37.7749, lng: -122.4194 },
      "Los Angeles": { lat: 34.0522, lng: -118.2437 },
      "Toronto": { lat: 43.6532, lng: -79.3832 },
      "Sydney": { lat: -33.8688, lng: 151.2093 },
      "Mumbai": { lat: 19.0760, lng: 72.8777 },
      "Delhi": { lat: 28.7041, lng: 77.1025 },
      "Bangalore": { lat: 12.9716, lng: 77.5946 },
      "Tokyo": { lat: 35.6762, lng: 139.6503 },
      "Paris": { lat: 48.8566, lng: 2.3522 },
      "Berlin": { lat: 52.5200, lng: 13.4050 },
      "Amsterdam": { lat: 52.3676, lng: 4.9041 },
      "Barcelona": { lat: 41.3851, lng: 2.1734 },
    };

    const coords = CITY_COORDS[city];
    if (coords) {
      filters.lat = coords.lat;
      filters.lng = coords.lng;
      filters.radius_km = 50; // Default 50km radius for city filtering
    }
  }

  // Location filtering by coordinates (overrides city if both provided)
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
 * Now includes source_name from event_sources join
 */
export async function GET(request: NextRequest) {
  try {
    const filters = parseFilters(request.nextUrl.searchParams);
    const user = await getServerUser();

    // Build base query with join to event_sources
    let query = supabase
      .from(TABLES.EVENTS)
      .select("*, event_sources(name, slug)", { count: "exact" });

    // Apply text search if provided
    if (filters.query) {
      query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
    }

    // Execute query to get all events (we filter in memory for complex cases)
    const { data: eventsData, error, count } = await query
      .order("fetched_at", { ascending: false })
      .order("start_time", { ascending: true });

    if (error) throw error;

    // Type assertion for joined data
    type EventWithSource = DbEvent & {
      event_sources: { name: string; slug: string } | null;
    };

    let events = (eventsData || []) as EventWithSource[];

    // Filter by sources
    if (filters.sources && filters.sources.length > 0) {
      const sources = await Promise.all(
        filters.sources.map(async (slug) => {
          const { data } = await supabase
            .from(TABLES.EVENT_SOURCES)
            .select("id")
            .eq("slug", slug)
            .single();
          return data;
        })
      );
      const sourceIds = new Set(sources.map((s) => s?.id).filter(Boolean));
      events = events.filter((e) => sourceIds.has(e.source_id));
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

    // Filter by location using nearby events function
    if (filters.lat !== undefined && filters.lng !== undefined) {
      const { data: nearbyEvents } = await supabase.rpc("get_nearby_events", {
        lat: filters.lat,
        lng: filters.lng,
        radius_km: filters.radius_km || 50,
        limit_count: 1000,
      });
      const nearbyEventIds = new Set((nearbyEvents || []).map((e: DbEvent) => e.id));
      events = events.filter((e) => nearbyEventIds.has(e.id));
    }

    // Filter by categories
    if (filters.categories && filters.categories.length > 0) {
      events = events.filter((e) =>
        e.category ? filters.categories!.includes(e.category) : false
      );
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

    // Filter out hidden events (if authenticated)
    if (user && !filters.include_hidden) {
      const hiddenEventIds = new Set<string>();
      for (const event of events) {
        if (await isEventHidden(user.id, event.id)) {
          hiddenEventIds.add(event.id);
        }
      }
      events = events.filter((e) => !hiddenEventIds.has(e.id));
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

    // Enhance with user interaction state and flatten source data
    const enhancedEvents: EventWithInteractions[] = [];
    for (const event of paginatedEvents) {
      const { event_sources, ...eventData } = event;

      let eventWithInteractions: EventWithInteractions = {
        ...eventData,
        source_id: event.source_id,
        source_name: event_sources?.name,
        source_slug: event_sources?.slug,
      };

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
