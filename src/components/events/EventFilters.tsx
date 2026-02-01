/**
 * Event Filters Component
 * Provides filtering options for the event feed
 * Now uses URL-based state management for better filtering
 */

"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CitySelector } from "./CitySelector";

const SOURCES = [
  { value: "eventbrite", label: "Eventbrite" },
  { value: "meetup", label: "Meetup" },
  { value: "luma", label: "Luma" },
  { value: "fractional-dubai", label: "Fractional Dubai" },
];

const DEFAULT_CATEGORIES = [
  "Technology",
  "Business",
  "Networking",
  "Music",
  "Arts",
  "Sports",
  "Food & Drink",
  "Education",
];

export function EventFilters({
  availableCategories = DEFAULT_CATEGORIES,
  availableSources = SOURCES.map((s) => s.value),
}: {
  availableCategories?: string[];
  availableSources?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get current filter values from URL
  const searchQuery = searchParams.get("q") || "";
  const selectedSources = searchParams.get("sources")?.split(",").filter(Boolean) || [];
  const selectedCategories = searchParams.get("categories")?.split(",").filter(Boolean) || [];

  // Update URL params
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`/?${params.toString()}`);
  };

  const handleSearchChange = (value: string) => {
    updateParams({ q: value || null });
  };

  const toggleSource = (source: string) => {
    const newSources = selectedSources.includes(source)
      ? selectedSources.filter((s) => s !== source)
      : [...selectedSources, source];
    updateParams({ sources: newSources.length > 0 ? newSources.join(",") : null });
  };

  const toggleCategory = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    updateParams({ categories: newCategories.length > 0 ? newCategories.join(",") : null });
  };

  const clearAllFilters = () => {
    updateParams({ q: null, sources: null, categories: null });
  };

  const hasActiveFilters =
    searchQuery || selectedSources.length > 0 || selectedCategories.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
      {/* Search Bar and City Selector */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <CitySelector />
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-2 rounded-lg border transition-colors ${
            isExpanded
              ? "bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Clear all filters"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Expandable Filters */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Source Filters */}
          {availableSources.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sources
              </h3>
              <div className="flex flex-wrap gap-2">
                {SOURCES.filter((s) => availableSources.includes(s.value)).map(
                  (source) => (
                    <button
                      key={source.value}
                      onClick={() => toggleSource(source.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedSources.includes(source.value)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {source.label}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Category Filters */}
          {availableCategories.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedCategories.includes(category)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Active filters:
                </span>
                {selectedSources.map((source) => (
                  <span
                    key={source}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1"
                  >
                    {source}
                    <button
                      onClick={() => toggleSource(source)}
                      className="hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedCategories.map((category) => (
                  <span
                    key={category}
                    className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full flex items-center gap-1"
                  >
                    {category}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="hover:text-purple-900 dark:hover:text-purple-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
