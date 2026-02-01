/**
 * City Selector Component
 * Allows users to select a city for event discovery
 * Now uses URL-based state management for better filtering
 */

"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPinIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

const CITIES = [
  { name: "Dubai", slug: "dubai", lat: 25.2048, lng: 55.2708 },
  { name: "Abu Dhabi", slug: "abu-dhabi", lat: 24.4539, lng: 54.3773 },
  { name: "Sharjah", slug: "sharjah", lat: 25.3467, lng: 55.4097 },
  { name: "Riyadh", slug: "riyadh", lat: 24.7136, lng: 46.6753 },
  { name: "Doha", slug: "doha", lat: 25.2854, lng: 51.5310 },
  { name: "Kuwait City", slug: "kuwait", lat: 29.3759, lng: 47.9774 },
  { name: "Manama", slug: "manama", lat: 26.0667, lng: 50.5577 },
  { name: "Muscat", slug: "muscat", lat: 23.5859, lng: 58.3849 },
  { name: "Jeddah", slug: "jeddah", lat: 21.5433, lng: 39.1728 },
  { name: "Singapore", slug: "singapore", lat: 1.3521, lng: 103.8198 },
  { name: "London", slug: "london", lat: 51.5074, lng: -0.1278 },
  { name: "New York", slug: "nyc", lat: 40.7128, lng: -74.0060 },
  { name: "San Francisco", slug: "san-francisco", lat: 37.7749, lng: -122.4194 },
  { name: "Los Angeles", slug: "los-angeles", lat: 34.0522, lng: -118.2437 },
  { name: "Toronto", slug: "toronto", lat: 43.6532, lng: -79.3832 },
  { name: "Sydney", slug: "sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Mumbai", slug: "mumbai", lat: 19.0760, lng: 72.8777 },
  { name: "Delhi", slug: "delhi", lat: 28.7041, lng: 77.1025 },
  { name: "Bangalore", slug: "bangalore", lat: 12.9716, lng: 77.5946 },
  { name: "Tokyo", slug: "tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Paris", slug: "paris", lat: 48.8566, lng: 2.3522 },
  { name: "Berlin", slug: "berlin", lat: 52.5200, lng: 13.4050 },
  { name: "Amsterdam", slug: "amsterdam", lat: 52.3676, lng: 4.9041 },
  { name: "Barcelona", slug: "barcelona", lat: 41.3851, lng: 2.1734 },
];

export function CitySelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Get current city from URL params
  const selectedCity = searchParams.get("city") || "All Cities";

  // Update URL when city changes
  const updateCity = (cityName: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (cityName === "All Cities") {
      params.delete("city");
    } else {
      params.set("city", cityName);
    }

    // Navigate to new URL preserving other params
    router.push(`/?${params.toString()}`);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <MapPinIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <span className="font-medium">{selectedCity}</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50">
          <div className="p-2">
            {/* "All Cities" option */}
            <button
              onClick={() => updateCity("All Cities")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedCity === "All Cities"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4" />
                <span className="font-medium">All Cities</span>
              </div>
            </button>

            <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>

            {/* City list grouped by region */}
            {[
              { region: "UAE", cities: CITIES.filter((c) => ["dubai", "abu-dhabi", "sharjah"].includes(c.slug)) },
              { region: "Gulf", cities: CITIES.filter((c) => ["riyadh", "doha", "kuwait", "manama", "muscat", "jeddah"].includes(c.slug)) },
              { region: "Asia", cities: CITIES.filter((c) => ["singapore", "mumbai", "delhi", "bangalore", "tokyo"].includes(c.slug)) },
              { region: "Europe", cities: CITIES.filter((c) => ["london", "paris", "berlin", "amsterdam", "barcelona"].includes(c.slug)) },
              { region: "North America", cities: CITIES.filter((c) => ["new-york", "san-francisco", "los-angeles", "toronto"].includes(c.slug)) },
              { region: "Oceania", cities: CITIES.filter((c) => ["sydney"].includes(c.slug)) },
            ].map((group) => (
              group.cities.length > 0 && (
                <div key={group.region} className="mb-2">
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {group.region}
                  </div>
                  {group.cities.map((city) => (
                    <button
                      key={city.slug}
                      onClick={() => updateCity(city.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCity === city.name
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
