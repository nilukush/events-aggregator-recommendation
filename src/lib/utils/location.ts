/**
 * Location Utilities
 * Helper functions for parsing and formatting location data
 */

/**
 * Reverse geocode coordinates to approximate city name
 * Uses coordinate ranges to guess the city/region
 */
export function getCityFromCoordinates(lat: number, lng: number): string | null {
  // Define city bounding boxes (simplified)
  const cities: { name: string; bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } }[] = [
    // UAE
    { name: "Dubai", bounds: { minLat: 24.8, maxLat: 25.4, minLng: 54.8, maxLng: 55.6 } },
    { name: "Abu Dhabi", bounds: { minLat: 24.2, maxLat: 24.6, minLng: 54.3, maxLng: 54.8 } },
    { name: "Sharjah", bounds: { minLat: 25.2, maxLat: 25.5, minLng: 55.3, maxLng: 55.6 } },
    // Gulf
    { name: "Riyadh", bounds: { minLat: 24.5, maxLat: 25.0, minLng: 46.5, maxLng: 47.0 } },
    { name: "Doha", bounds: { minLat: 25.2, maxLat: 25.4, minLng: 51.4, maxLng: 51.6 } },
    { name: "Kuwait City", bounds: { minLat: 29.3, maxLat: 29.4, minLng: 47.9, maxLng: 48.1 } },
    { name: "Manama", bounds: { minLat: 26.0, maxLat: 26.2, minLng: 50.5, maxLng: 50.6 } },
    { name: "Muscat", bounds: { minLat: 23.5, maxLat: 23.7, minLng: 58.3, maxLng: 58.6 } },
    // Asia
    { name: "Singapore", bounds: { minLat: 1.2, maxLat: 1.5, minLng: 103.8, maxLng: 104.0 } },
    { name: "Mumbai", bounds: { minLat: 18.9, maxLat: 19.3, minLng: 72.7, maxLng: 73.0 } },
    { name: "Delhi", bounds: { minLat: 28.4, maxLat: 28.8, minLng: 76.8, maxLng: 77.3 } },
    { name: "Bangalore", bounds: { minLat: 12.8, maxLat: 13.2, minLng: 77.4, maxLng: 77.8 } },
    { name: "Tokyo", bounds: { minLat: 35.5, maxLat: 35.9, minLng: 139.5, maxLng: 140.0 } },
    { name: "Hong Kong", bounds: { minLat: 22.2, maxLat: 22.4, minLng: 114.1, maxLng: 114.3 } },
    { name: "Shanghai", bounds: { minLat: 31.0, maxLat: 31.5, minLng: 121.3, maxLng: 121.8 } },
    { name: "Bangkok", bounds: { minLat: 13.6, maxLat: 13.9, minLng: 100.4, maxLng: 100.8 } },
    { name: "Jakarta", bounds: { minLat: -6.3, maxLat: -6.0, minLng: 106.7, maxLng: 107.0 } },
    { name: "Manila", bounds: { minLat: 14.5, maxLat: 14.7, minLng: 120.9, maxLng: 121.1 } },
    { name: "Kuala Lumpur", bounds: { minLat: 3.0, maxLat: 3.3, minLng: 101.5, maxLng: 101.8 } },
    // Europe
    { name: "London", bounds: { minLat: 51.3, maxLat: 51.7, minLng: -0.5, maxLng: 0.2 } },
    { name: "Paris", bounds: { minLat: 48.8, maxLat: 49.0, minLng: 2.2, maxLng: 2.5 } },
    { name: "Berlin", bounds: { minLat: 52.3, maxLat: 52.6, minLng: 13.2, maxLng: 13.6 } },
    { name: "Amsterdam", bounds: { minLat: 52.3, maxLat: 52.4, minLng: 4.8, maxLng: 5.0 } },
    { name: "Barcelona", bounds: { minLat: 41.3, maxLat: 41.5, minLng: 2.1, maxLng: 2.3 } },
    { name: "Madrid", bounds: { minLat: 40.3, maxLat: 40.5, minLng: -3.8, maxLng: -3.6 } },
    { name: "Rome", bounds: { minLat: 41.8, maxLat: 42.0, minLng: 12.4, maxLng: 12.6 } },
    { name: "Vienna", bounds: { minLat: 48.1, maxLat: 48.3, minLng: 16.3, maxLng: 16.5 } },
    // North America
    { name: "New York", bounds: { minLat: 40.5, maxLat: 40.9, minLng: -74.1, maxLng: -73.8 } },
    { name: "San Francisco", bounds: { minLat: 37.7, maxLat: 37.8, minLng: -122.5, maxLng: -122.4 } },
    { name: "Los Angeles", bounds: { minLat: 33.9, maxLat: 34.1, minLng: -118.5, maxLng: -118.2 } },
    { name: "Toronto", bounds: { minLat: 43.6, maxLat: 43.8, minLng: -79.5, maxLng: -79.3 } },
    { name: "Chicago", bounds: { minLat: 41.8, maxLat: 42.0, minLng: -87.7, maxLng: -87.6 } },
    { name: "Boston", bounds: { minLat: 42.3, maxLat: 42.4, minLng: -71.1, maxLng: -70.9 } },
    { name: "Seattle", bounds: { minLat: 47.5, maxLat: 47.7, minLng: -122.5, maxLng: -122.2 } },
    { name: "Austin", bounds: { minLat: 30.2, maxLat: 30.4, minLng: -97.8, maxLng: -97.6 } },
    { name: "Miami", bounds: { minLat: 25.7, maxLat: 25.9, minLng: -80.3, maxLng: -80.1 } },
    { name: "Washington", bounds: { minLat: 38.8, maxLat: 39.0, minLng: -77.1, maxLng: -76.9 } },
    // Australia
    { name: "Sydney", bounds: { minLat: -33.9, maxLat: -33.8, minLng: 151.2, maxLng: 151.3 } },
    { name: "Melbourne", bounds: { minLat: -37.9, maxLat: -37.7, minLng: 144.9, maxLng: 145.0 } },
    { name: "Brisbane", bounds: { minLat: -27.5, maxLat: -27.3, minLng: 153.0, maxLng: 153.1 } },
    { name: "Perth", bounds: { minLat: -32.0, maxLat: -31.8, minLng: 115.8, maxLng: 116.0 } },
  ];

  for (const city of cities) {
    if (lat >= city.bounds.minLat && lat <= city.bounds.maxLat &&
        lng >= city.bounds.minLng && lng <= city.bounds.maxLng) {
      return city.name;
    }
  }

  return null;
}

/**
 * List of known cities for matching
 * Ordered by priority (most common first)
 */
const KNOWN_CITIES = [
  // UAE
  "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah",
  "Al Ain", "Dubai Marina", "Downtown Dubai", "Jumeirah", "Business Bay", "Palm Jumeirah",
  // Gulf
  "Riyadh", "Jeddah", "Dammam", "Doha", "Kuwait City", "Manama", "Muscat",
  // Asia
  "Singapore", "Mumbai", "Delhi", "Bangalore", "Tokyo", "Seoul", "Hong Kong", "Shanghai",
  "Bangkok", "Jakarta", "Manila", "Kuala Lumpur",
  // Europe
  "London", "Paris", "Berlin", "Amsterdam", "Barcelona", "Madrid", "Rome", "Milan",
  "Vienna", "Prague", "Warsaw", "Budapest",
  // North America
  "New York", "San Francisco", "Los Angeles", "Toronto", "Vancouver", "Chicago",
  "Boston", "Seattle", "Austin", "Miami", "Washington",
  // Australia
  "Sydney", "Melbourne", "Brisbane", "Perth",
];

/**
 * Extract city name from location string
 * Looks for known city names in the location text
 */
export function extractCity(locationName: string | null): string | null {
  if (!locationName) return null;

  const location = locationName.trim();

  // Check if the location is just "Online" or similar
  if (/^(online|virtual|remote)$/i.test(location)) {
    return null;
  }

  // Try to find a known city in the location string
  for (const city of KNOWN_CITIES) {
    // Match city name followed by word boundary OR comma/end of string
    // This handles "Dubai", "Dubai,", "Dubai, UAE" etc.
    const regex = new RegExp(`\\b${city}(?:\\b|,|$)`, 'i');
    if (regex.test(location)) {
      return city;
    }
  }

  // If no known city found, try to extract from common patterns
  // Pattern: "City, Country" or "City, State, Country"
  const parts = location.split(',').map(p => p.trim());
  if (parts.length > 0) {
    const firstPart = parts[0];
    // If the first part is short (likely a city name), return it
    if (firstPart.length <= 30 && !/\d/.test(firstPart)) {
      return firstPart;
    }
  }

  // Fallback: return the first few words if reasonable
  const words = location.split(' ').slice(0, 3).join(' ');
  if (words.length <= 30) {
    return words;
  }

  return location.substring(0, 30);
}

/**
 * Check if an event is virtual/online
 */
export function isVirtualEvent(locationName: string | null, isVirtual: boolean): boolean {
  if (isVirtual) return true;
  if (!locationName) return false;
  return /^(online|virtual|remote|zoom|teams|google meet|webex)/i.test(locationName);
}

/**
 * Format location for display
 */
export function formatLocation(locationName: string | null, isVirtual: boolean): string {
  if (isVirtualEvent(locationName, isVirtual)) {
    return "Online Event";
  }
  return locationName || "Location TBD";
}
