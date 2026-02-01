/**
 * Event Detail Page
 * Shows full event details with similar events
 */

import { notFound } from "next/navigation";
import { EventCard } from "@/components/events/EventCard";
import { CardSkeleton } from "@/components/ui/LoadingSpinner";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
  TagIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

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
}

async function getEvent(id: string): Promise<Event | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/events/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

async function getSimilarEvents(
  eventId: string,
  category?: string | null,
  tags?: string[] | null
): Promise<Event[]> {
  try {
    const params = new URLSearchParams();
    params.set("per_page", "6");
    params.set("exclude_id", eventId);

    if (category) {
      params.set("categories", category);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/events?${params.toString()}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.success ? (data.data.events || []) : [];
  } catch {
    return [];
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, similarEvents] = await Promise.all([
    getEvent(id),
    getEvent(id).then((e) => getSimilarEvents(id, e?.category, e?.tags)),
  ]);

  if (!event) {
    notFound();
  }

  const eventDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Back to Events</span>
        </Link>

        {/* Event Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
          {/* Event Image */}
          {event.image_url ? (
            <div className="relative h-64 sm:h-80 w-full">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ) : (
            <div className="relative h-64 sm:h-80 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-8xl font-bold opacity-30">
                {event.title.charAt(0)}
              </span>
            </div>
          )}

          {/* Event Content */}
          <div className="p-6 sm:p-8 -mt-20 relative">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sm:p-8">
              {/* Category */}
              {event.category && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full capitalize">
                    {event.category}
                  </span>
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {event.title}
              </h1>

              {/* Event Details */}
              <div className="space-y-4 mb-6">
                {/* Date and Time */}
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(eventDate)}
                    </p>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <ClockIcon className="h-4 w-4" />
                      <span>
                        {formatTime(eventDate)}
                        {endDate && ` - ${formatTime(endDate)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Location */}
                {event.location_name && !event.is_virtual && (
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {event.location_name}
                      </p>
                      {event.location_lat && event.location_lng && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${event.location_lat},${event.location_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Open in Maps
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Virtual Event Badge */}
                {event.is_virtual && (
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <svg
                      className="h-6 w-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74-4.436a1 1 0 011.986 0l.74 4.436a1 1 0 01.986-.836h3a1 1 0 011 1v10a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H7a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V3zM15 4H9v1h6V4zM9 8h6v1h-6V8zm0 2h6v1h-6v-1z" />
                    </svg>
                    <span className="font-medium">Virtual Event</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {event.description && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    About this event
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <TagIcon className="h-5 w-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Tags
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={event.event_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                  <span>View Original Event</span>
                </a>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Browse More Events
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Events */}
        {similarEvents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Similar Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {similarEvents.map((similarEvent) => (
                <EventCard
                  key={similarEvent.id}
                  event={similarEvent}
                  showBookmark={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Loading skeleton for event detail page
 */
export function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="h-64 sm:h-80 bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="p-6 sm:p-8 space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
