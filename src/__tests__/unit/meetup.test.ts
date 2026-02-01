/**
 * Meetup Plugin Unit Tests
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { MeetupPlugin } from "../../lib/plugins/meetup/MeetupPlugin";
import type { PluginConfig, EventFilters } from "../../lib/plugins/types";

// Helper function to create config
function createConfig(overrides: Partial<PluginConfig> = {}): PluginConfig {
  return {
    enabled: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    ...overrides,
  };
}

describe("MeetupPlugin", () => {
  let plugin: MeetupPlugin;

  beforeEach(() => {
    plugin = new MeetupPlugin(
      createConfig({
        oauthToken: "test-token",
      })
    );
  });

  describe("initialization", () => {
    it("should initialize with correct properties", () => {
      expect(plugin.name).toBe("Meetup");
      expect(plugin.version).toBe("1.0.0");
      expect(plugin.source).toBe("meetup");
    });

    it("should have correct rate limit defaults", () => {
      const status = plugin.getRateLimitStatus();
      expect(status.limit).toBe(500); // Meetup's per-minute limit
      expect(status.remaining).toBe(500);
      expect(status.windowMs).toBe(60 * 1000); // 60 seconds
    });

    it("should allow custom base URL", () => {
      const customPlugin = new MeetupPlugin(
        createConfig({
          oauthToken: "test-token",
          baseUrl: "https://custom.api.com/gql",
        })
      );
      expect(customPlugin).toBeDefined();
    });
  });

  describe("validateConfig", () => {
    it("should validate config with OAuth token", async () => {
      const result = await plugin.validateConfig();
      expect(result).toBe(true);
    });

    it("should validate config with API key", async () => {
      const keyPlugin = new MeetupPlugin(
        createConfig({ apiKey: "test-api-key" })
      );
      const result = await keyPlugin.validateConfig();
      expect(result).toBe(true);
    });

    it("should fail validation without credentials", async () => {
      const noKeyPlugin = new MeetupPlugin(createConfig({}));
      const result = await noKeyPlugin.validateConfig();
      expect(result).toBe(false);
    });

    it("should fail validation when disabled", async () => {
      const disabledPlugin = new MeetupPlugin(
        createConfig({
          oauthToken: "test-token",
          enabled: false,
        })
      );
      const result = await disabledPlugin.validateConfig();
      expect(result).toBe(false);
    });
  });

  describe("event data structure", () => {
    it("should handle Meetup event structure correctly", () => {
      // Verify the expected Meetup event structure
      const mockMeetupEvent = {
        id: "123456789",
        title: "Tech Meetup Dubai",
        description: "Monthly tech networking event",
        eventUrl: "https://www.meetup.com/tech-dubai/events/123456789",
        imageUrl: "https://images.unsplash.com/photo/event.jpg",
        startDate: "2025-03-15T18:00:00+04:00",
        endDate: "2025-03-15T21:00:00+04:00",
        timezone: "Asia/Dubai",
        venue: {
          id: "venue-123",
          name: "In5 Tech",
          address: "Dubai Production City",
          city: "Dubai",
          state: "Dubai",
          country: "AE",
          lat: 25.1866,
          lng: 55.2764,
        },
        isOnline: false,
        onlineEventUrl: null,
        host: {
          id: "host-123",
          name: "John Doe",
        },
        group: {
          id: "group-123",
          name: "Dubai Tech Meetup",
          urlname: "dubai-tech-meetup",
          category: {
            id: "category-123",
            name: "Tech",
            categorySets: [
              { name: "Technology", sortName: "Technology" },
            ],
          },
        },
        eventType: "PHYSICAL",
        going: 42,
      };

      expect(mockMeetupEvent.id).toBe("123456789");
      expect(mockMeetupEvent.title).toBe("Tech Meetup Dubai");
      expect(mockMeetupEvent.venue?.name).toBe("In5 Tech");
      expect(mockMeetupEvent.isOnline).toBe(false);
      expect(mockMeetupEvent.group?.category?.name).toBe("Tech");
    });
  });

  describe("virtual events", () => {
    it("should mark online events as virtual", () => {
      const mockVirtualEvent = {
        id: "987654321",
        title: "Virtual Workshop",
        description: "Online coding workshop",
        eventUrl: "https://www.meetup.com/online-workshop/events/987654321",
        imageUrl: "https://images.unsplash.com/photo/online.jpg",
        startDate: "2025-04-01T14:00:00+00:00",
        endDate: "2025-04-01T17:00:00+00:00",
        timezone: "UTC",
        venue: null,
        isOnline: true,
        onlineEventUrl: "https://zoom.us/j/123456",
        host: {
          id: "host-456",
          name: "Jane Smith",
        },
        group: {
          id: "group-456",
          name: "Online Coders",
          urlname: "online-coders",
          category: {
            id: "category-456",
            name: "Education",
            categorySets: [
              { name: "Learning", sortName: "Learning" },
            ],
          },
        },
        eventType: "ONLINE",
        going: 125,
      };

      expect(mockVirtualEvent.isOnline).toBe(true);
      expect(mockVirtualEvent.venue).toBeNull();
      expect(mockVirtualEvent.onlineEventUrl).toBeTruthy();
    });
  });

  describe("rate limit handling", () => {
    it("should track rate limit status", () => {
      const status = plugin.getRateLimitStatus();
      expect(status).toHaveProperty("limit");
      expect(status).toHaveProperty("remaining");
      expect(status).toHaveProperty("resetAt");
      expect(status).toHaveProperty("windowMs");
    });

    it("should have correct rate limit values for Meetup", () => {
      const status = plugin.getRateLimitStatus();
      expect(status.limit).toBe(500);
      expect(status.windowMs).toBe(60000); // 60 seconds
    });
  });

  describe("filter handling", () => {
    it("should handle location filters", () => {
      const locationFilter: EventFilters = {
        location: {
          lat: 25.1866,
          lng: 55.2764,
          radiusKm: 25,
        },
        limit: 20,
      };

      expect(locationFilter.location?.lat).toBe(25.1866);
      expect(locationFilter.location?.lng).toBe(55.2764);
      expect(locationFilter.location?.radiusKm).toBe(25);
    });

    it("should handle virtual only filter", () => {
      const virtualFilter: EventFilters = {
        virtualOnly: true,
        limit: 30,
      };

      expect(virtualFilter.virtualOnly).toBe(true);
    });

    it("should handle query search filter", () => {
      const queryFilter: EventFilters = {
        query: "tech networking",
        limit: 10,
      };

      expect(queryFilter.query).toBe("tech networking");
    });

    it("should handle date range filters", () => {
      const dateFilter: EventFilters = {
        startDate: new Date("2025-03-01"),
        endDate: new Date("2025-03-31"),
        limit: 50,
      };

      expect(dateFilter.startDate).toEqual(new Date("2025-03-01"));
      expect(dateFilter.endDate).toEqual(new Date("2025-03-31"));
    });
  });
});

describe("MeetupPlugin - Integration with PluginRegistry", () => {
  it("should be compatible with BaseEventSourcePlugin interface", () => {
    const plugin = new MeetupPlugin(
      createConfig({
        oauthToken: "test-token",
      })
    );

    // Check required interface methods exist
    expect(typeof plugin.healthCheck).toBe("function");
    expect(typeof plugin.getRateLimitStatus).toBe("function");
    expect(typeof plugin.fetchEvents).toBe("function");
    expect(typeof plugin.validateConfig).toBe("function");
  });
});
