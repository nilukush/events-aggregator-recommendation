/**
 * Recommendations Page
 * Personalized event recommendations based on user preferences
 */

"use client";

import React from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EventCard } from "@/components/events/EventCard";
import { EventFilters } from "@/components/events/EventFilters";
import { CardSkeleton, PageLoading } from "@/components/ui/LoadingSpinner";
import {
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export default function RecommendationsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [events, setEvents] = React.useState<any[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);

  const loadRecommendations = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    }

    try {
      const url = new URL("/api/recommendations", window.location.origin);
      if (refresh) {
        url.searchParams.set("refresh", "true");
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success && data.data) {
        // Extract events from recommendations
        const recEvents = (data.data.recommendations || []).map((rec: any) => ({
          ...rec.event,
          is_bookmarked: false,
          score: rec.score,
          reason: rec.reason,
        }));

        // Add new events if feed mode
        const newEvents = data.data.new || [];
        setEvents([...recEvents, ...newEvents]);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      loadRecommendations();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <SparklesIcon className="mx-auto h-16 w-16 text-purple-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Personalized Recommendations
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Sign in to get personalized event recommendations based on your interests
            and preferences.
          </p>
          <a
            href="/auth/signin"
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <SparklesIcon className="h-8 w-8 text-purple-500" />
              For You
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Events picked just for you based on your interests
            </p>
          </div>
          <button
            onClick={() => {
              setShowFilters(!showFilters);
            }}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <AdjustmentsHorizontalIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Refresh Button */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {events.length > 0
              ? `Found ${events.length} events for you`
              : "Loading your recommendations..."}
          </p>
          <button
            onClick={() => loadRecommendations(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6">
            <EventFilters
              availableCategories={[
                "Technology",
                "Business",
                "Networking",
                "Music",
                "Arts",
                "Sports",
                "Food & Drink",
                "Education",
              ]}
            />
          </div>
        )}

        {/* Events List */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                showSource
                showBookmark
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
