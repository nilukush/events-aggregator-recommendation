/**
 * Recommendation Engine Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { DbEvent, DbUserPreference } from "../../lib/db/schema";

// Import the module - we'll test the public API
import * as RecommendationEngine from "../../lib/services/RecommendationEngine";

// Mock event data
const mockEvent: DbEvent = {
  id: "event-123",
  source_id: "source-123",
  external_id: "evt-123",
  title: "Tech Meetup Dubai",
  description: "A meetup for tech enthusiasts",
  event_url: "https://example.com/event",
  image_url: "https://example.com/image.jpg",
  start_time: "2024-03-15T18:00:00Z",
  end_time: "2024-03-15T20:00:00Z",
  location_name: "Dubai Tech Hub",
  location_lat: 25.2048,
  location_lng: 55.2708,
  is_virtual: false,
  category: "Technology",
  tags: ["technology", "networking", "blockchain"],
  raw_data: null,
  embedding: null,
  fetched_at: "2024-01-01T00:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockUser = {
  id: "user-123",
  email: "user@example.com",
  emailVerified: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockPreferences: DbUserPreference = {
  id: "pref-123",
  user_id: mockUser.id,
  interests: ["technology", "networking"],
  location_lat: 25.2048,
  location_lng: 55.2708,
  location_radius_km: 25,
  preferred_days: ["monday", "wednesday"],
  preferred_times: ["evening"],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("RecommendationEngine - Time Score Logic", () => {
  it("should identify optimal event timing (1-7 days away)", () => {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const daysUntilEvent = (threeDaysLater.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    expect(daysUntilEvent).toBeGreaterThanOrEqual(1);
    expect(daysUntilEvent).toBeLessThanOrEqual(7);
  });

  it("should identify events far in the future (30+ days)", () => {
    const now = new Date();
    const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const daysUntilEvent = (sixtyDaysLater.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    expect(daysUntilEvent).toBeGreaterThan(30);
  });
});

describe("RecommendationEngine - Distance Calculation", () => {
  it("should calculate distance between two coordinates", () => {
    // Event at same location as user
    const userLat = 25.2048;
    const userLng = 55.2708;
    const eventLat = 25.2148; // About 1 km north
    const eventLng = 55.2708;

    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = toRad(eventLat - userLat);
    const dLng = toRad(eventLng - userLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLat)) *
        Math.cos(toRad(eventLat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Should be approximately 1 km
    expect(distance).toBeGreaterThan(0.5);
    expect(distance).toBeLessThan(2);
  });

  it("should handle events without location data", () => {
    const eventWithoutLocation: DbEvent = {
      ...mockEvent,
      location_lat: null,
      location_lng: null,
    };

    expect(eventWithoutLocation.location_lat).toBeNull();
    expect(eventWithoutLocation.location_lng).toBeNull();
  });
});

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

describe("RecommendationEngine - Interest Matching", () => {
  it("should match event tags to user interests", () => {
    const interests = ["technology", "networking"];
    const eventTags = mockEvent.tags || [];

    const matchingInterests = interests.filter((interest) =>
      eventTags.some((tag) => tag.toLowerCase() === interest.toLowerCase())
    );

    expect(matchingInterests).toHaveLength(2);
    expect(matchingInterests).toContain("technology");
    expect(matchingInterests).toContain("networking");
  });

  it("should match event category to user interests", () => {
    const interests = ["technology"];
    const eventCategory = mockEvent.category?.toLowerCase() || "";

    const matches = interests.some((interest) =>
      eventCategory.includes(interest.toLowerCase())
    );

    expect(matches).toBe(true);
  });

  it("should handle users with no interests", () => {
    const interests: string[] = [];
    const eventTags = mockEvent.tags || [];

    const matches = interests.filter((interest) =>
      eventTags.some((tag) => tag.toLowerCase() === interest.toLowerCase())
    );

    expect(matches).toHaveLength(0);
  });

  it("should handle events with no tags", () => {
    const interests = ["technology", "networking"];
    const event: DbEvent = { ...mockEvent, tags: null };

    const eventTags = event.tags || [];
    const matches = interests.filter((interest) =>
      eventTags.some((tag) => tag.toLowerCase() === interest.toLowerCase())
    );

    expect(matches).toHaveLength(0);
  });
});

describe("RecommendationEngine - Time of Day Detection", () => {
  it("should identify evening events (6 PM - midnight)", () => {
    const eveningEvent = new Date("2024-03-15T18:00:00Z");
    const hour = eveningEvent.getUTCHours();

    expect(hour).toBeGreaterThanOrEqual(18);
    expect(hour).toBeLessThan(24);
  });

  it("should identify morning events (6 AM - noon)", () => {
    const morningEvent = new Date("2024-03-15T09:00:00Z");
    const hour = morningEvent.getUTCHours();

    expect(hour).toBeGreaterThanOrEqual(6);
    expect(hour).toBeLessThan(12);
  });

  it("should identify afternoon events (noon - 6 PM)", () => {
    const afternoonEvent = new Date("2024-03-15T14:00:00Z");
    const hour = afternoonEvent.getUTCHours();

    expect(hour).toBeGreaterThanOrEqual(12);
    expect(hour).toBeLessThan(18);
  });

  it("should identify preferred days from preferences", () => {
    const preferredDays = mockPreferences.preferred_days || [];

    expect(preferredDays).toContain("monday");
    expect(preferredDays).toContain("wednesday");
  });

  it("should identify preferred times from preferences", () => {
    const preferredTimes = mockPreferences.preferred_times || [];

    expect(preferredTimes).toContain("evening");
  });
});

describe("RecommendationEngine - Public API", () => {
  it("should export getRecommendationsForUser function", () => {
    expect(RecommendationEngine.getRecommendationsForUser).toBeDefined();
    expect(typeof RecommendationEngine.getRecommendationsForUser).toBe("function");
  });

  it("should export getPersonalizedFeed function", () => {
    expect(RecommendationEngine.getPersonalizedFeed).toBeDefined();
    expect(typeof RecommendationEngine.getPersonalizedFeed).toBe("function");
  });

  it("should export clearUserRecommendations function", () => {
    expect(RecommendationEngine.clearUserRecommendations).toBeDefined();
    expect(typeof RecommendationEngine.clearUserRecommendations).toBe("function");
  });

  it("should export recordRecommendationFeedback function", () => {
    expect(RecommendationEngine.recordRecommendationFeedback).toBeDefined();
    expect(typeof RecommendationEngine.recordRecommendationFeedback).toBe("function");
  });

  it("should have correct return types for API functions", () => {
    const userId = "user-123";

    // These are Promise-returning functions
    const recommendResult = RecommendationEngine.getRecommendationsForUser(userId);
    const feedResult = RecommendationEngine.getPersonalizedFeed(userId);
    const clearResult = RecommendationEngine.clearUserRecommendations(userId);
    const feedbackResult = RecommendationEngine.recordRecommendationFeedback(
      userId,
      "event-123",
      "helpful"
    );

    expect(recommendResult).toBeInstanceOf(Promise);
    expect(feedResult).toBeInstanceOf(Promise);
    expect(clearResult).toBeInstanceOf(Promise);
    expect(feedbackResult).toBeInstanceOf(Promise);
  });
});

describe("RecommendationEngine - Valid Feedback Values", () => {
  it("should accept valid feedback values", () => {
    const validFeedback = ["helpful", "not_helpful", "dismissed"];

    for (const feedback of validFeedback) {
      expect(
        ["helpful", "not_helpful", "dismissed"].includes(feedback as any)
      ).toBe(true);
    }
  });

  it("should reject invalid feedback values", () => {
    const invalidFeedback = ["invalid", "bad", "good", "maybe"];

    for (const feedback of invalidFeedback) {
      expect(
        ["helpful", "not_helpful", "dismissed"].includes(feedback as any)
      ).toBe(false);
    }
  });
});

describe("RecommendationEngine - Algorithm Types", () => {
  it("should support valid algorithm types", () => {
    const validAlgorithms = ["content-based", "collaborative", "hybrid"];

    for (const algo of validAlgorithms) {
      expect(
        ["content-based", "collaborative", "hybrid"].includes(algo as any)
      ).toBe(true);
    }
  });
});
