/**
 * Event Card Component
 * Displays a single event with all relevant information
 * Now includes city and source badges
 */

"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { CalendarIcon, MapPinIcon, ClockIcon, BookmarkIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import type { DbEvent } from "@/lib/db/schema";
import { extractCity, getCityFromCoordinates } from "@/lib/utils/location";

export interface EventCardProps {
  event: {
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
    match_score?: number;
    match_reasons?: string[];
  };
  onBookmark?: (eventId: string) => void;
  onClick?: (eventId: string) => void;
  showBookmark?: boolean;
}

export function EventCard({
  event,
  onBookmark,
  onClick,
  showBookmark = true,
}: EventCardProps) {
  const eventDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;
  const timeUntilEvent = formatDistanceToNow(eventDate, { addSuffix: true });

  // Extract city from coordinates first (more accurate), then fall back to location name
  let city = null;
  if (event.location_lat && event.location_lng) {
    city = getCityFromCoordinates(event.location_lat, event.location_lng);
  }
  if (!city) {
    city = extractCity(event.location_name);
  }

  const formatEventTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark?.(event.id);
  };

  const handleCardClick = () => {
    onClick?.(event.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden group ${
        event.match_score !== undefined && event.match_score >= 0.7
          ? 'ring-2 ring-green-400 dark:ring-green-600 ring-opacity-50'
          : ''
      }`}
    >
      {/* Event Image */}
      {event.image_url ? (
        <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-700">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {/* Source Badge */}
            {event.source_name && (
              <span className="px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-xs font-medium rounded-full shadow-sm">
                {event.source_name}
              </span>
            )}
            {/* City Badge */}
            {city && !event.is_virtual && (
              <span className="px-2 py-1 bg-blue-500/90 dark:bg-blue-600/90 backdrop-blur-sm text-white text-xs font-medium rounded-full shadow-sm">
                {city}
              </span>
            )}
            {/* Virtual Badge */}
            {event.is_virtual && (
              <span className="px-2 py-1 bg-purple-500/90 dark:bg-purple-600/90 backdrop-blur-sm text-white text-xs font-medium rounded-full shadow-sm">
                Virtual
              </span>
            )}
          </div>
          {showBookmark && (
            <button
              onClick={handleBookmarkClick}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 transition-colors"
            >
              {event.is_bookmarked ? (
                <BookmarkSolidIcon className="h-5 w-5 text-blue-600" />
              ) : (
                <BookmarkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white text-6xl font-bold opacity-30">
            {event.title.charAt(0)}
          </span>
          {/* Badges overlay - no image */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {/* Source Badge */}
            {event.source_name && (
              <span className="px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-xs font-medium rounded-full shadow-sm">
                {event.source_name}
              </span>
            )}
            {/* City Badge */}
            {city && !event.is_virtual && (
              <span className="px-2 py-1 bg-blue-500/90 dark:bg-blue-600/90 backdrop-blur-sm text-white text-xs font-medium rounded-full shadow-sm">
                {city}
              </span>
            )}
            {/* Virtual Badge */}
            {event.is_virtual && (
              <span className="px-2 py-1 bg-purple-500/90 dark:bg-purple-600/90 backdrop-blur-sm text-white text-xs font-medium rounded-full shadow-sm">
                Virtual
              </span>
            )}
          </div>
          {showBookmark && (
            <button
              onClick={handleBookmarkClick}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 transition-colors"
            >
              {event.is_bookmarked ? (
                <BookmarkSolidIcon className="h-5 w-5 text-blue-600" />
              ) : (
                <BookmarkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Event Content */}
      <div className="p-4">
        {/* Category Tag */}
        {event.category && (
          <div className="mb-2">
            <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full capitalize">
              {event.category}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">
          {event.title}
        </h3>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {event.description}
          </p>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                +{event.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Match Indicators */}
        {event.match_score !== undefined && event.match_score > 0 && (
          <div className="mb-3 space-y-2">
            {/* Match Score Badge */}
            <div className="flex items-center gap-2">
              <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                event.match_score >= 0.7
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : event.match_score >= 0.5
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {Math.round(event.match_score * 100)}% match
              </div>
            </div>

            {/* Match Reasons */}
            {event.match_reasons && event.match_reasons.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {event.match_reasons.slice(0, 2).map((reason, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-full"
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Event Details */}
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          {/* Date and Time */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>{formatDate(eventDate)}</span>
            <span>•</span>
            <ClockIcon className="h-4 w-4" />
            <span>
              {formatEventTime(eventDate)}
              {endDate && ` - ${formatEventTime(endDate)}`}
            </span>
          </div>

          {/* Location */}
          {event.location_name && !event.is_virtual && (
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              <span className="truncate">{event.location_name}</span>
            </div>
          )}

          {/* Virtual Badge for detail text */}
          {event.is_virtual && (
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-purple-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74-4.436a1 1 0 011.986 0l.74 4.436a1 1 0 01.986-.836h3a1 1 0 011 1v10a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H7a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V3zM15 4H9v1h6V4zM9 8h6v1h-6V8zm0 2h6v1h-6v-1z" />
              </svg>
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                Online Event
              </span>
            </div>
          )}

          {/* Time until event */}
          <div className="text-xs text-gray-500 dark:text-gray-500 pt-1">
            {timeUntilEvent}
          </div>
        </div>
      </div>
    </div>
  );
}
