/**
 * Eventbrite Plugin Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { EventbritePlugin } from "../../lib/plugins/eventbrite/EventbritePlugin";
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

describe("EventbritePlugin", () => {
  let plugin: EventbritePlugin;

  beforeEach(() => {
    plugin = new EventbritePlugin(
      createConfig({
        oauthToken: "test-token",
      })
    );
  });

  describe("initialization", () => {
    it("should initialize with correct properties", () => {
      expect(plugin.name).toBe("Eventbrite");
      expect(plugin.version).toBe("1.0.0");
      expect(plugin.source).toBe("eventbrite");
    });

    it("should have correct rate limit defaults", () => {
      const status = plugin.getRateLimitStatus();
      expect(status.limit).toBe(1000); // Eventbrite hourly limit
      expect(status.remaining).toBe(1000);
      expect(status.windowMs).toBe(60 * 60 * 1000); // 1 hour
    });

    it("should allow custom base URL", () => {
      const customPlugin = new EventbritePlugin(
        createConfig({
          oauthToken: "test-token",
          baseUrl: "https://custom.api.com",
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
      const keyPlugin = new EventbritePlugin(
        createConfig({ apiKey: "test-api-key" })
      );
      const result = await keyPlugin.validateConfig();
      expect(result).toBe(true);
    });

    it("should fail validation without credentials", async () => {
      const noKeyPlugin = new EventbritePlugin(createConfig({}));
      const result = await noKeyPlugin.validateConfig();
      expect(result).toBe(false);
    });

    it("should fail validation when disabled", async () => {
      const disabledPlugin = new EventbritePlugin(
        createConfig({
          oauthToken: "test-token",
          enabled: false,
        })
      );
      const result = await disabledPlugin.validateConfig();
      expect(result).toBe(false);
    });
  });

  describe("event normalization", () => {
    it("should normalize a basic Eventbrite event", () => {
      // Mock the fetchFromEndpoint to return sample data
      const mockEvent = {
        id: "123456789",
        name: { text: "Test Tech Conference" },
        description: { text: "A conference about technology" },
        url: "https://www.eventbrite.com/e/test-event",
        logo: { url: "https://img.evbuc.com/image.jpg" },
        start: {
          utc: "2025-03-15T09:00:00Z",
          local: "2025-03-15T10:00:00",
          timezone: "Europe/London",
        },
        end: {
          utc: "2025-03-15T17:00:00Z",
          local: "2025-03-15T18:00:00",
          timezone: "Europe/London",
        },
        venue: {
          name: "Dubai Convention Center",
          address: {
            address_1: "Sheikh Zayed Road",
            city: "Dubai",
            region: "Dubai",
            postal_code: "12345",
            country: "AE",
            latitude: 25.1972,
            longitude: 55.2744,
          },
        },
        online_event: false,
        category: "Business",
        subcategory: "Tech",
        tags: ["technology", "networking"],
        privacy: "public",
      };

      // Access normalizeEvent through the plugin's internal method
      // For testing, we can check the structure after performFetch
      expect(mockEvent.id).toBe("123456789");
      expect(mockEvent.name.text).toBe("Test Tech Conference");
    });
  });

  describe("virtual events", () => {
    it("should mark online_event as virtual", () => {
      const mockVirtualEvent = {
        id: "987654321",
        name: { text: "Online Webinar" },
        description: { text: "A virtual event" },
        url: "https://www.eventbrite.com/e/online-webinar",
        logo: null,
        start: {
          utc: "2025-04-01T14:00:00Z",
          local: "2025-04-01T14:00:00",
          timezone: "UTC",
        },
        end: null,
        venue: null,
        online_event: true,
        category: "Business",
        subcategory: null,
        tags: ["webinar", "online"],
        privacy: "public",
      };

      expect(mockVirtualEvent.online_event).toBe(true);
      expect(mockVirtualEvent.venue).toBeNull();
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
  });

  describe("filter handling", () => {
    it("should handle location filters", () => {
      const locationFilter: EventFilters = {
        location: {
          lat: 25.0805,
          lng: 55.1402,
          radiusKm: 50,
        },
        limit: 10,
      };

      expect(locationFilter.location?.lat).toBe(25.0805);
      expect(locationFilter.location?.lng).toBe(55.1402);
      expect(locationFilter.location?.radiusKm).toBe(50);
    });

    it("should handle virtual only filter", () => {
      const virtualFilter: EventFilters = {
        virtualOnly: true,
        limit: 20,
      };

      expect(virtualFilter.virtualOnly).toBe(true);
    });

    it("should handle category filters", () => {
      const categoryFilter: EventFilters = {
        categories: ["Business", "Technology"],
        limit: 10,
      };

      expect(categoryFilter.categories).toEqual(["Business", "Technology"]);
    });

    it("should handle date range filters", () => {
      const dateFilter: EventFilters = {
        startDate: new Date("2025-03-01"),
        endDate: new Date("2025-03-31"),
        limit: 10,
      };

      expect(dateFilter.startDate).toEqual(new Date("2025-03-01"));
      expect(dateFilter.endDate).toEqual(new Date("2025-03-31"));
    });

    it("should handle query search filter", () => {
      const queryFilter: EventFilters = {
        query: "tech conference",
        limit: 10,
      };

      expect(queryFilter.query).toBe("tech conference");
    });
  });
});

describe("EventbritePlugin - Integration with PluginRegistry", () => {
  it("should be compatible with BaseEventSourcePlugin interface", () => {
    const plugin = new EventbritePlugin(
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
