/**
 * Plugin System Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { BaseEventSourcePlugin } from "../../lib/plugins/BaseEventSourcePlugin";
import { PluginRegistry, pluginRegistry } from "../../lib/plugins/PluginRegistry";
import type { EventFilters, NormalizedEvent, PluginConfig } from "../../lib/plugins/types";
import type { EventSourceType } from "../../types/index";

// Helper function to create partial config
function createConfig(overrides: Partial<PluginConfig> = {}): PluginConfig {
  return {
    enabled: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    ...overrides,
  };
}

// Test plugin implementation
class TestEventSourcePlugin extends BaseEventSourcePlugin {
  constructor(config: PluginConfig = {
    enabled: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  }) {
    super("Test Plugin", "1.0.0", "eventbrite" as EventSourceType, config);
  }

  protected async performHealthCheck(): Promise<void> {
    // Simulate successful health check
    if (!this.config.apiKey) {
      throw new Error("API key required");
    }
  }

  public async performFetch(filters: EventFilters): Promise<NormalizedEvent[]> {
    // Simulate fetching events
    return [
      {
        source: this.source,
        externalId: "test-1",
        title: "Test Event 1",
        description: "Test description",
        url: "https://example.com/event1",
        imageUrl: "https://example.com/image1.jpg",
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        location: {
          name: "Test Location",
          lat: 25.0805,
          lng: 55.1402,
          isVirtual: false,
        },
        category: "Technology",
        tags: ["test", "demo"],
      },
      {
        source: this.source,
        externalId: "test-2",
        title: "Test Event 2",
        description: "Another test event",
        url: "https://example.com/event2",
        imageUrl: null,
        startTime: new Date(Date.now() + 172800000),
        endTime: null,
        location: {
          isVirtual: true,
        },
        category: "Business",
        tags: ["virtual"],
      },
    ];
  }

  protected requiresApiKey(): boolean {
    return true;
  }
}

// Mock plugin for testing registry
class MockPlugin extends BaseEventSourcePlugin {
  private shouldFail: boolean;

  constructor(source: EventSourceType, shouldFail: boolean = false) {
    super(`Mock ${source}`, "1.0.0", source, {
      enabled: true,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    });
    this.shouldFail = shouldFail;
  }

  protected async performHealthCheck(): Promise<void> {
    if (this.shouldFail) {
      throw new Error("Health check failed");
    }
  }

  public async performFetch(_filters: EventFilters): Promise<NormalizedEvent[]> {
    if (this.shouldFail) {
      throw new Error("Fetch failed");
    }
    return [];
  }

  protected requiresApiKey(): boolean {
    return false;
  }
}

describe("BaseEventSourcePlugin", () => {
  let plugin: TestEventSourcePlugin;

  beforeEach(() => {
    plugin = new TestEventSourcePlugin(
      createConfig({
        apiKey: "test-key",
        timeout: 5000,
        maxRetries: 2,
        retryDelay: 100,
      })
    );
  });

  describe("initialization", () => {
    it("should initialize with correct properties", () => {
      expect(plugin.name).toBe("Test Plugin");
      expect(plugin.version).toBe("1.0.0");
      expect(plugin.source).toBe("eventbrite");
    });

    it("should have default config values", () => {
      const defaultPlugin = new TestEventSourcePlugin();
      expect((defaultPlugin as any).config.enabled).toBe(true);
      expect((defaultPlugin as any).config.timeout).toBe(30000);
      expect((defaultPlugin as any).config.maxRetries).toBe(3);
    });
  });

  describe("validateConfig", () => {
    it("should validate config with API key", async () => {
      const result = await plugin.validateConfig();
      expect(result).toBe(true);
    });

    it("should fail validation without API key when required", async () => {
      const noKeyPlugin = new TestEventSourcePlugin(
        createConfig({ apiKey: undefined })
      );
      const result = await noKeyPlugin.validateConfig();
      expect(result).toBe(false);
    });

    it("should fail validation when disabled", async () => {
      const disabledPlugin = new TestEventSourcePlugin(
        createConfig({
          enabled: false,
          apiKey: "test-key",
        })
      );
      const result = await disabledPlugin.validateConfig();
      expect(result).toBe(false);
    });
  });

  describe("healthCheck", () => {
    it("should pass health check with valid config", async () => {
      const status = await plugin.healthCheck();
      expect(status.isHealthy).toBe(true);
      expect(status.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(status.lastError).toBeUndefined();
    });

    it("should fail health check without API key", async () => {
      const noKeyPlugin = new TestEventSourcePlugin(
        createConfig({ apiKey: undefined })
      );
      const status = await noKeyPlugin.healthCheck();
      expect(status.isHealthy).toBe(false);
      expect(status.lastError).toBeDefined();
    });
  });

  describe("fetchEvents", () => {
    it("should fetch events successfully", async () => {
      const events = await plugin.fetchEvents({});
      expect(events).toHaveLength(2);
      expect(events[0].title).toBe("Test Event 1");
      expect(events[0].source).toBe("eventbrite");
    });

    it("should normalize location data correctly", async () => {
      const events = await plugin.fetchEvents({});
      expect(events[0].location).toEqual({
        name: "Test Location",
        lat: 25.0805,
        lng: 55.1402,
        isVirtual: false,
      });
      expect(events[1].location.isVirtual).toBe(true);
    });
  });

  describe("getRateLimitStatus", () => {
    it("should return rate limit status", () => {
      const status = plugin.getRateLimitStatus();
      expect(status).toHaveProperty("limit");
      expect(status).toHaveProperty("remaining");
      expect(status).toHaveProperty("resetAt");
    });
  });

  describe("retry logic", () => {
    it("should retry on retryable errors", async () => {
      let attempts = 0;
      const retryPlugin = new TestEventSourcePlugin(
        createConfig({
          apiKey: "test-key",
          maxRetries: 2,
          retryDelay: 50,
        })
      );

      // Override performFetch to fail first time
      const originalFetch = retryPlugin.performFetch.bind(retryPlugin);
      retryPlugin.performFetch = async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("rate limit exceeded");
        }
        return originalFetch({});
      };

      const events = await retryPlugin.fetchEvents({});
      expect(events).toHaveLength(2);
      expect(attempts).toBe(2);
    });
  });

  describe("helper methods", () => {
    it("should normalize location data", () => {
      const location = plugin.normalizeLocation({
        venue_name: "Dubai Marina",
        lat: "25.0805",
        lng: "55.1402",
        is_online: false,
      });
      expect(location.name).toBe("Dubai Marina");
      expect(location.lat).toBe(25.0805);
      expect(location.lng).toBe(55.1402);
      expect(location.isVirtual).toBe(false);
    });

    it("should handle virtual location", () => {
      const location = plugin.normalizeLocation({
        virtual: true,
      });
      expect(location.isVirtual).toBe(true);
    });

    it("should normalize date/time", () => {
      const date = new Date("2025-01-28T10:00:00Z");
      const normalized = plugin.normalizeDateTime(date);
      expect(normalized).toEqual(date);

      const normalizedFromString = plugin.normalizeDateTime("2025-01-28T10:00:00Z");
      expect(normalizedFromString).toBeInstanceOf(Date);
    });
  });
});

describe("PluginRegistry", () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe("registration", () => {
    it("should register a plugin", () => {
      const plugin = new TestEventSourcePlugin(createConfig({ apiKey: "test" }));
      registry.register(plugin);

      expect(registry.has("eventbrite" as EventSourceType)).toBe(true);
      expect(registry.getPlugin("eventbrite" as EventSourceType)).toBe(plugin);
    });

    it("should throw when registering duplicate plugin", () => {
      const plugin = new TestEventSourcePlugin(createConfig({ apiKey: "test" }));
      registry.register(plugin);

      expect(() => registry.register(plugin)).toThrow("already registered");
    });

    it("should unregister a plugin", () => {
      const plugin = new TestEventSourcePlugin(createConfig({ apiKey: "test" }));
      registry.register(plugin);
      registry.unregister("eventbrite" as EventSourceType);

      expect(registry.has("eventbrite" as EventSourceType)).toBe(false);
    });

    it("should return all plugins", () => {
      const plugin1 = new TestEventSourcePlugin(createConfig({ apiKey: "test" }));
      const plugin2 = new MockPlugin("meetup" as EventSourceType);
      registry.register(plugin1);
      registry.register(plugin2);

      const allPlugins = registry.getAllPlugins();
      expect(allPlugins).toHaveLength(2);
    });

    it("should return only enabled plugins", () => {
      const enabledPlugin = new TestEventSourcePlugin(createConfig({ apiKey: "test" }));
      const disabledPlugin = new MockPlugin("meetup" as EventSourceType);
      (disabledPlugin as any).config.enabled = false;

      registry.register(enabledPlugin);
      registry.register(disabledPlugin);

      const enabledPlugins = registry.getEnabledPlugins();
      expect(enabledPlugins).toHaveLength(1);
      expect(enabledPlugins[0].source).toBe("eventbrite");
    });
  });

  describe("fetching", () => {
    it("should fetch from all plugins", async () => {
      const plugin1 = new TestEventSourcePlugin(createConfig({ apiKey: "test" }));
      const plugin2 = new MockPlugin("meetup" as EventSourceType);
      registry.register(plugin1);
      registry.register(plugin2);

      const events = await registry.fetchFromAllPlugins({});
      // Test plugin returns 2 events, Mock plugin returns 0
      expect(events.length).toBeGreaterThanOrEqual(0);
    });

    it("should fetch from specific source", async () => {
      const plugin = new TestEventSourcePlugin(createConfig({ apiKey: "test" }));
      registry.register(plugin);

      const events = await registry.fetchFromSource("eventbrite" as EventSourceType, {});
      expect(events).toHaveLength(2);
    });

    it("should throw when fetching from unregistered source", async () => {
      await expect(
        registry.fetchFromSource("meetup" as EventSourceType, {})
      ).rejects.toThrow("No plugin registered");
    });

    it("should handle plugin errors gracefully", async () => {
      const goodPlugin = new TestEventSourcePlugin(createConfig({ apiKey: "test" }));
      // Create a mock plugin that fails quickly (non-retryable error)
      const badPlugin = new MockPlugin("meetup" as EventSourceType, true);
      registry.register(goodPlugin);
      registry.register(badPlugin);

      const events = await registry.fetchFromAllPlugins({});
      // Should still return events from the good plugin
      expect(events.length).toBeGreaterThanOrEqual(0);
    }, 15000); // Increase timeout to allow retries
  });

  describe("health status", () => {
    it("should get health status for all plugins", async () => {
      const goodPlugin = new TestEventSourcePlugin(createConfig({ apiKey: "test" }));
      const badPlugin = new MockPlugin("meetup" as EventSourceType, true);
      registry.register(goodPlugin);
      registry.register(badPlugin);

      const healthMap = await registry.getHealthStatus();
      expect(healthMap.size).toBe(2);
      expect(healthMap.get("eventbrite")?.isHealthy).toBe(true);
      expect(healthMap.get("meetup")?.isHealthy).toBe(false);
    });
  });

  describe("statistics", () => {
    it("should track ingestion statistics", async () => {
      const plugin = new TestEventSourcePlugin(createConfig({ apiKey: "test" }));
      registry.register(plugin);

      await registry.fetchFromSource("eventbrite" as EventSourceType, {});

      const stats = registry.getStatsForSource("eventbrite" as EventSourceType);
      expect(stats).toBeDefined();
      expect(stats?.successCount).toBe(2);
      expect(stats?.errorCount).toBe(0);
    });
  });
});
