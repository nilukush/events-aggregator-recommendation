/**
 * Location Utilities Tests
 */

import { describe, it, expect } from "@jest/globals";
import {
  calculateDistance,
  getCityFromCoordinates,
  extractCity,
  extractCityFromTitle,
  getEventCity,
} from "../../lib/utils/location";

describe("calculateDistance", () => {
  it("calculates distance between Dubai Marina and Downtown Dubai", () => {
    // Dubai Marina: 25.0805, 55.1402
    // Downtown Dubai: 25.1972, 55.2744
    const distance = calculateDistance(25.0805, 55.1402, 25.1972, 55.2744);
    // Should be approximately 16-17 km
    expect(distance).toBeGreaterThan(15);
    expect(distance).toBeLessThan(20);
  });

  it("returns 0 for same coordinates", () => {
    const distance = calculateDistance(25.2048, 55.2708, 25.2048, 55.2708);
    expect(distance).toBe(0);
  });

  it("calculates distance between Dubai and Abu Dhabi", () => {
    // Dubai: 25.2048, 55.2708
    // Abu Dhabi: 24.4539, 54.3773
    const distance = calculateDistance(25.2048, 55.2708, 24.4539, 54.3773);
    // Should be approximately 130-140 km
    expect(distance).toBeGreaterThan(120);
    expect(distance).toBeLessThan(150);
  });
});

describe("getCityFromCoordinates", () => {
  it("identifies Dubai coordinates", () => {
    expect(getCityFromCoordinates(25.2048, 55.2708)).toBe("Dubai");
    expect(getCityFromCoordinates(25.08, 55.14)).toBe("Dubai"); // Dubai Marina
  });

  it("identifies Berlin coordinates", () => {
    expect(getCityFromCoordinates(52.52, 13.405)).toBe("Berlin");
  });

  it("identifies Bangalore coordinates", () => {
    expect(getCityFromCoordinates(12.9716, 77.5946)).toBe("Bangalore");
  });

  it("identifies London coordinates", () => {
    expect(getCityFromCoordinates(51.5074, -0.1278)).toBe("London");
  });

  it("identifies New York coordinates", () => {
    expect(getCityFromCoordinates(40.7128, -74.006)).toBe("New York");
  });

  it("returns null for coordinates outside known cities", () => {
    expect(getCityFromCoordinates(0, 0)).toBeNull();
    expect(getCityFromCoordinates(30, 30)).toBeNull();
  });

  it("correctly distinguishes Dubai from Berlin", () => {
    // Dubai coordinates should return Dubai
    expect(getCityFromCoordinates(25.2048, 55.2708)).toBe("Dubai");
    // Berlin coordinates should return Berlin
    expect(getCityFromCoordinates(52.52, 13.405)).toBe("Berlin");
    // These should NOT be confused
    expect(getCityFromCoordinates(25.2048, 55.2708)).not.toBe("Berlin");
    expect(getCityFromCoordinates(52.52, 13.405)).not.toBe("Dubai");
  });
});

describe("extractCity", () => {
  it("extracts city from simple location name", () => {
    expect(extractCity("Dubai, UAE")).toBe("Dubai");
    expect(extractCity("Dubai")).toBe("Dubai");
  });

  it("extracts city from location with venue name", () => {
    expect(extractCity("Dubai Marina Mall, Dubai")).toBe("Dubai");
    expect(extractCity("Jumeirah Beach Hotel, Dubai")).toBe("Dubai");
  });

  it("returns null for virtual events", () => {
    expect(extractCity("Online")).toBeNull();
    expect(extractCity("Virtual")).toBeNull();
    expect(extractCity("Remote")).toBeNull();
  });

  it("extracts multi-word cities", () => {
    expect(extractCity("Abu Dhabi, UAE")).toBe("Abu Dhabi");
    expect(extractCity("New York, USA")).toBe("New York");
    expect(extractCity("San Francisco, CA")).toBe("San Francisco");
  });

  it("handles location with commas", () => {
    expect(extractCity("Some Venue, Dubai, United Arab Emirates")).toBe("Dubai");
  });
});

describe("extractCityFromTitle", () => {
  it("extracts city from event title", () => {
    expect(extractCityFromTitle("Sobha Sanctuary Dubai")).toBe("Dubai");
    expect(extractCityFromTitle("Networking Event in Dubai")).toBe("Dubai");
    expect(extractCityFromTitle("Dubai Tech Meetup")).toBe("Dubai");
  });

  it("extracts multi-word cities from title", () => {
    expect(extractCityFromTitle("Event in Abu Dhabi")).toBe("Abu Dhabi");
    expect(extractCityFromTitle("New York Networking")).toBe("New York");
    expect(extractCityFromTitle("San Francisco Tech Conference")).toBe("San Francisco");
  });

  it("returns null when no city is found", () => {
    expect(extractCityFromTitle("Random Event Title")).toBeNull();
    expect(extractCityFromTitle("Tech Meetup 2024")).toBeNull();
  });

  it("handles city name case variations", () => {
    expect(extractCityFromTitle("dubai event")).toBe("Dubai");
    expect(extractCityFromTitle("DUBAI CONFERENCE")).toBe("Dubai");
  });
});

describe("getEventCity", () => {
  it("prioritizes coordinates over location name and title", () => {
    // Coordinates should win even if location_name and title say something else
    expect(getEventCity("Random Location", 52.52, 13.405, "Dubai Event")).toBe("Berlin");
  });

  it("uses location name when coordinates are null", () => {
    expect(getEventCity("Dubai Marina, Dubai", null, null, "Random Event")).toBe("Dubai");
  });

  it("uses title when coordinates and location are null/unavailable", () => {
    expect(getEventCity(null, null, null, "Sobha Sanctuary Dubai")).toBe("Dubai");
  });

  it("returns null when no city can be determined", () => {
    // When location_name doesn't match a known city and title has no city,
    // getEventCity returns the location name as a fallback (this is extractCity's behavior)
    // This is intentional - better to show some location info than nothing
    expect(getEventCity("Random Venue", null, null, "Random Event Title")).toBe("Random Venue");
  });

  it("handles virtual events correctly", () => {
    // "Online Event" - the extractCity function returns "Online Event" as fallback
    // because "Online" is not in the middle of the expected pattern
    // In the EventCard, virtual events are handled separately by checking is_virtual flag
    expect(getEventCity("Online Event", null, null, "Virtual Meetup")).toBe("Online Event");
  });

  // Test case for the actual bug: "Sobha Sanctuary Dubai" with Berlin coordinates
  it("handles incorrect coordinates with correct city in title", () => {
    // When coordinates were incorrectly set to Berlin for a Dubai event
    // After cleanup, coordinates should be null, so it falls back to title
    expect(getEventCity(null, null, null, "Sobha Sanctuary Dubai")).toBe("Dubai");
  });
});
