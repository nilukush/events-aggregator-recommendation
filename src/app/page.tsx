/**
 * EventNexus Home Page
 * Main event feed with filtering and recommendations
 */

import { Suspense } from "react";
import { PersonalizedEventList } from "@/components/events/PersonalizedEventList";
import { CardSkeleton } from "@/components/ui/LoadingSpinner";
import Link from "next/link";

async function getEvents() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/events?page=1&per_page=12`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.success ? (data.data?.events || []) : [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const initialEvents = await getEvents();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Discover Events
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Find your next experience from events across all platforms
          </p>
        </header>

        {/* Event Filters */}
        <EventFiltersWrapper />

        {/* Events List with Personalization */}
        <Suspense fallback={<LoadingGrid />}>
          <PersonalizedEventList initialEvents={initialEvents} />
        </Suspense>
      </div>
    </main>
  );
}

/**
 * Client-side wrapper for filters to enable interactivity
 */
import { EventFilters } from "@/components/events/EventFilters";

function EventFiltersWrapper() {
  return (
    <Suspense fallback={<div className="h-20" />}>
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
        availableSources={["eventbrite", "meetup", "luma", "fractional-dubai"]}
      />
    </Suspense>
  );
}

/**
 * Loading skeleton for events grid
 */
function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
