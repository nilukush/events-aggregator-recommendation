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
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Discover Events
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Find your next experience from events across all platforms
            </p>
          </div>
          <Link
            href="/preferences"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-.826 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-.826a1.724 1.724 0 00-1.065-2.572c-.426-1.756-2.924-1.756-3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37.826a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.351.724 1.724 0 002.573-1.066c1.543.94 3.31-.826 2.37-.826a1.724 1.724 0 001.066-2.572c.426-1.756 2.924-1.756 3.35 0zM15.756 10.5a1.724 1.724 0 002.573 1.066c1.543-.94 3.31-.826 2.37-.826a1.724 1.724 0 001.065-2.572c-.426-1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573 1.066c-1.543.94-3.31.826-2.37.826a1.724 1.724 0 00-1.065 2.572c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 002.573-1.066c1.543.94 3.31.826 2.37.826a1.724 1.724 0 001.065-2.572" />
            </svg>
            <span>Preferences</span>
          </Link>
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
