/**
 * Personalized Event List Component
 * Fetches events based on user preferences when authenticated
 * Now watches URL params for city, source, category filtering
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EventCard } from "./EventCard";
import { CardSkeleton } from "../ui/LoadingSpinner";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface Event {
  id: string;
  source_id: string;
  external_id: string;
  title: string;
  description: string | null;
  event_url: string;
  image_url: string | null;
  start_time: string;
  end_time: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  is_virtual: boolean;
  category: string | null;
  tags: string[] | null;
  is_bookmarked?: boolean;
  is_hidden?: boolean;
  source_name?: string;
  source_slug?: string;
}

interface PersonalizedEventListProps {
  initialEvents?: Event[];
  pageSize?: number;
}

export function PersonalizedEventList({
  initialEvents = [],
  pageSize = 12,
}: PersonalizedEventListProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [usingPersonalization, setUsingPersonalization] = useState(false);

  // Fetch user preferences if authenticated
  const fetchUserPreferences = useCallback(async () => {
    if (!isAuthenticated || !user) return null;

    try {
      const response = await fetch("/api/user/preferences");
      if (!response.ok) return null;

      const data = await response.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  }, [isAuthenticated, user]);

  // Build URL with all filter params
  const buildFetchUrl = useCallback(
    async (pageNum: number) => {
      const params = new URLSearchParams();
      params.set("page", pageNum.toString());
      params.set("per_page", pageSize.toString());

      // Add URL params from searchParams (city, sources, categories, query)
      const city = searchParams.get("city");
      if (city && city !== "All Cities") {
        params.set("city", city);
      }

      const sources = searchParams.get("sources");
      if (sources) {
        params.set("sources", sources);
      }

      const categories = searchParams.get("categories");
      if (categories) {
        params.set("categories", categories);
      }

      const query = searchParams.get("q");
      if (query) {
        params.set("q", query);
      }

      // Add user preferences if authenticated (overrides some URL params for personalization)
      const prefs = await fetchUserPreferences();
      if (prefs) {
        setUsingPersonalization(true);

        // Only add location filter if not already set by city selector
        if (!city && prefs.location_lat !== null && prefs.location_lng !== null) {
          params.set("lat", prefs.location_lat.toString());
          params.set("lng", prefs.location_lng.toString());
          params.set(
            "radius_km",
            (prefs.location_radius_km || 50).toString()
          );
        }

        // Add interests filter
        if (prefs.interests && prefs.interests.length > 0) {
          params.set("interests", prefs.interests.join(","));
        }

        // Add preferred days/times
        if (prefs.preferred_days && prefs.preferred_days.length > 0) {
          params.set("preferred_days", prefs.preferred_days.join(","));
        }
        if (prefs.preferred_times && prefs.preferred_times.length > 0) {
          params.set("preferred_times", prefs.preferred_times.join(","));
        }
      } else {
        setUsingPersonalization(false);
      }

      return `/api/events?${params.toString()}`;
    },
    [searchParams, pageSize, fetchUserPreferences]
  );

  // Load events function
  const loadEvents = useCallback(
    async (pageNum: number, isLoadMore = false) => {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const url = await buildFetchUrl(pageNum);
        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.data) {
          const newEvents = data.data.events || [];

          if (isLoadMore) {
            setEvents((prev) => [...prev, ...newEvents]);
          } else {
            setEvents(newEvents);
          }

          setHasMore(data.data.has_more || false);
          setPage(pageNum);
        } else {
          setError(data.error || "Failed to load events");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [buildFetchUrl]
  );

  // Load events when URL params change
  useEffect(() => {
    loadEvents(1);
  }, [searchParams]); // Only depend on searchParams, not loadEvents

  // Also reload when auth state changes
  useEffect(() => {
    if (user) {
      loadEvents(1);
    }
  }, [user?.id]);

  const handleBookmark = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/bookmark`, {
        method: "PUT",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEvents((prev) =>
            prev.map((e) =>
              e.id === eventId
                ? { ...e, is_bookmarked: data.data?.bookmarked || !e.is_bookmarked }
                : e
            )
          );
        }
      }
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    }
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400 mb-2">Error loading events</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm">{error}</p>
        <button
          onClick={() => loadEvents(1)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-16 w-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          No events found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {usingPersonalization
            ? "Try adjusting your preferences or location settings"
            : "Try adjusting your filters or check back later"}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Personalization Notice */}
      {usingPersonalization && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Showing events personalized based on your preferences.
          </p>
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onBookmark={handleBookmark}
            onClick={(eventId) => router.push(`/events/${eventId}`)}
            showBookmark
          />
        ))}
      </div>

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading more events...
          </div>
        </div>
      )}

      {/* Load More Button */}
      {hasMore && !isLoadingMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={() => loadEvents(page + 1, true)}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Load More
            <ChevronDownIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* End of List */}
      {!hasMore && events.length > 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          You've reached the end of the list
        </div>
      )}
    </div>
  );
}
