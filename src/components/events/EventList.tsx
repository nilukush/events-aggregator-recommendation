/**
 * Event List Component
 * Manages the display of events with pagination and infinite scroll
 */

"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { EventCard } from "./EventCard";
import { CardSkeleton, PageLoading } from "../ui/LoadingSpinner";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export interface EventListProps {
  initialEvents?: Array<{
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
  }>;
  fetchUrl?: string;
  pageSize?: number;
  onBookmark?: (eventId: string) => void;
  onEventClick?: (eventId: string) => void;
}

export function EventList({
  initialEvents = [],
  fetchUrl = "/api/events",
  pageSize = 10,
  onBookmark,
  onEventClick,
}: EventListProps) {
  const [events, setEvents] = useState(initialEvents);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const observerTarget = useRef<HTMLButtonElement | null>(null);

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
        const url = new URL(fetchUrl, window.location.origin);
        url.searchParams.set("page", pageNum.toString());
        url.searchParams.set("per_page", pageSize.toString());

        const response = await fetch(url.toString());
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
    [fetchUrl, pageSize]
  );

  // Initial load
  useEffect(() => {
    if (initialEvents.length === 0) {
      loadEvents(1);
    } else {
      setHasMore(initialEvents.length >= pageSize);
    }
  }, [initialEvents, pageSize, loadEvents]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadEvents(page + 1, true);
        }
      },
      { rootMargin: "100px" }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, page, loadEvents]);

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
          onBookmark?.(eventId);
        }
      }
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    }
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-4">
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
          Try adjusting your filters or check back later
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onBookmark={handleBookmark}
            onClick={onEventClick}
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

      {/* Load More Button (fallback) */}
      {hasMore && !isLoadingMore && (
        <div className="flex justify-center py-8">
          <button
            ref={observerTarget}
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
