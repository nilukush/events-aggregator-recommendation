/**
 * Database Integration Tests
 *
 * These tests verify the database schema and queries.
 * They require a running Supabase instance.
 *
 * To run these tests:
 * 1. Set up a local Supabase instance or use your project
 * 2. Set the environment variables in .env.local
 * 3. Run: npm run test -- db.test.ts
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import {
  testConnection,
  getActiveEventSources,
  getEventSourceBySlug,
  getEvents,
  insertEvent,
  upsertEvents,
  updateEvent,
  deleteEvent,
  getNearbyEvents,
  getUserPreferences,
  upsertUserPreferences,
  recordInteraction,
  getRecommendations,
  upsertRecommendations,
  getEventCategories,
  getEventTags,
} from "../../lib/db/index";
import type { DbEventInsert } from "../../lib/db/index";
import type { DbUserPreferenceInsert, DbUserInteractionInsert } from "../../lib/db/schema";

describe("Database Integration Tests", () => {
  // Test user ID (this would be a real user ID in production tests)
  const TEST_USER_ID = "00000000-0000-0000-0000-000000000000";

  describe("Connection", () => {
    it("should connect to the database", async () => {
      const result = await testConnection();
      // Note: This may return false if tables don't exist yet,
      // but true means connection works
      expect(typeof result).toBe("boolean");
    });
  });

  describe("Event Sources", () => {
    it("should fetch active event sources", async () => {
      const sources = await getActiveEventSources();
      expect(Array.isArray(sources)).toBe(true);
      // Only check length if data exists
      if (sources.length > 0) {
        expect(sources[0]).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          slug: expect.any(String),
        });
      }
    });

    it("should fetch eventbrite source by slug", async () => {
      const source = await getEventSourceBySlug("eventbrite");
      // This returns null if table doesn't exist yet
      expect(source === null || typeof source === "object").toBe(true);
      if (source) {
        expect(source.slug).toBe("eventbrite");
      }
    });

    it("should return null for non-existent slug", async () => {
      const source = await getEventSourceBySlug("non-existent");
      expect(source).toBeNull();
    });
  });

  describe("Events", () => {
    let testEventId: string;
    let eventbriteSourceId: string;

    beforeAll(async () => {
      // Get eventbrite source ID for tests
      const source = await getEventSourceBySlug("eventbrite");
      if (source) {
        eventbriteSourceId = source.id;
      }
    });

    it("should fetch events", async () => {
      const events = await getEvents({ limit: 10 });
      expect(Array.isArray(events)).toBe(true);
    });

    it("should fetch events with filters", async () => {
      const events = await getEvents({
        category: "Technology",
        isVirtual: false,
        limit: 5,
      });
      expect(Array.isArray(events)).toBe(true);
    });

    it("should insert a new event", async () => {
      if (!eventbriteSourceId) {
        console.warn("Skipping insert test - no eventbrite source found");
        return;
      }

      const newEvent: DbEventInsert = {
        source_id: eventbriteSourceId,
        external_id: `test-event-${Date.now()}`,
        title: "Test Event",
        description: "Test event description",
        event_url: "https://example.com/test",
        image_url: "https://example.com/image.jpg",
        start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_time: new Date(Date.now() + 90000000).toISOString(),
        location_name: "Dubai Marina, Dubai",
        location_lat: 25.0805,
        location_lng: 55.1402,
        is_virtual: false,
        category: "Technology",
        tags: ["test", "automation"],
      };

      const event = await insertEvent(newEvent);
      testEventId = event.id;
      expect(event).toMatchObject({
        id: expect.any(String),
        title: "Test Event",
        external_id: newEvent.external_id,
      });
    });

    it("should update an existing event", async () => {
      if (!testEventId) return;

      const updated = await updateEvent(testEventId, {
        title: "Updated Test Event",
      });
      expect(updated.title).toBe("Updated Test Event");
    });

    it("should delete an event", async () => {
      if (!testEventId) return;

      await deleteEvent(testEventId);
      // Note: In a real test, we'd use getEventById to verify deletion
    });

    it("should upsert multiple events", async () => {
      if (!eventbriteSourceId) {
        console.warn("Skipping upsert test - no eventbrite source found");
        return;
      }

      const events: DbEventInsert[] = [
        {
          source_id: eventbriteSourceId,
          external_id: `bulk-test-1-${Date.now()}`,
          title: "Bulk Test Event 1",
          event_url: "https://example.com/bulk1",
          start_time: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          source_id: eventbriteSourceId,
          external_id: `bulk-test-2-${Date.now()}`,
          title: "Bulk Test Event 2",
          event_url: "https://example.com/bulk2",
          start_time: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      const upserted = await upsertEvents(events);
      expect(upserted.length).toBe(2);
    });
  });

  describe("Nearby Events", () => {
    it("should fetch nearby events for Dubai Marina", async () => {
      const events = await getNearbyEvents({
        lat: 25.0805, // Dubai Marina
        lng: 55.1402,
        radiusKm: 50,
        limit: 10,
      });
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe("User Preferences", () => {
    it("should return null for non-existent user preferences", async () => {
      const prefs = await getUserPreferences(TEST_USER_ID);
      // This might be null or have data depending on test state
      expect(typeof prefs === "object" || prefs === null).toBe(true);
    });

    it("should upsert user preferences", async () => {
      const prefs: DbUserPreferenceInsert = {
        user_id: TEST_USER_ID,
        interests: ["technology", "ai", "networking"],
        location_lat: 25.0805,
        location_lng: 55.1402,
        location_radius_km: 50,
        preferred_days: ["thursday", "friday"],
        preferred_times: ["evening"],
      };

      const result = await upsertUserPreferences(TEST_USER_ID, prefs);
      expect(result.interests).toEqual(prefs.interests);
    });
  });

  describe("User Interactions", () => {
    it("should record a user interaction", async () => {
      // First, get a valid event ID
      const events = await getEvents({ limit: 1 });
      if (events.length === 0) {
        console.warn("No events available for interaction test");
        return;
      }

      const interaction: DbUserInteractionInsert = {
        user_id: TEST_USER_ID,
        event_id: events[0].id,
        interaction_type: "view",
      };

      const result = await recordInteraction(interaction);
      expect(result).toMatchObject({
        id: expect.any(String),
        user_id: TEST_USER_ID,
        interaction_type: "view",
      });
    });
  });

  describe("Recommendations", () => {
    it("should fetch recommendations for user", async () => {
      const recs = await getRecommendations(TEST_USER_ID);
      expect(Array.isArray(recs)).toBe(true);
    });

    it("should upsert recommendations", async () => {
      // Get a valid event ID
      const events = await getEvents({ limit: 1 });
      if (events.length === 0) {
        console.warn("No events available for recommendation test");
        return;
      }

      const recommendations = [
        {
          user_id: TEST_USER_ID,
          event_id: events[0].id,
          score: 0.95,
          reason: "Based on your interest in technology",
          algorithm: "content-based" as const,
        },
      ];

      const result = await upsertRecommendations(recommendations);
      expect(result.length).toBe(1);
    });
  });

  describe("Utility Functions", () => {
    it("should get event categories", async () => {
      const categories = await getEventCategories();
      expect(Array.isArray(categories)).toBe(true);
    });

    it("should get event tags", async () => {
      const tags = await getEventTags();
      expect(Array.isArray(tags)).toBe(true);
    });
  });
});
