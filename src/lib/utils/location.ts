/**
 * Location Utilities
 * Helper functions for parsing and formatting location data
 */

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
