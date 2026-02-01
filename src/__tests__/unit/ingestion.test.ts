/**
 * Event Ingestion Service Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { EventIngestionService } from "../../lib/services/EventIngestionService";
import { pluginRegistry } from "../../lib/plugins/PluginRegistry";
import { BaseEventSourcePlugin } from "../../lib/plugins/BaseEventSourcePlugin";
import type { PluginConfig, EventFilters, NormalizedEvent } from "../../lib/plugins/types";
import type { EventSourceType } from "../../lib/plugins/types";
import type { IngestionConfig } from "../../lib/services/EventIngestionService";
import * as dbQueries from "../../lib/db/queries";

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

// Mock plugin implementation
class MockIngestionPlugin extends BaseEventSourcePlugin {
  constructor(
    source: EventSourceType,
    private mockEvents: NormalizedEvent[],
    config: PluginConfig = createConfig()
  ) {
    super(`Mock ${source}`, "1.0.0", source, config);
  }

  protected async performHealthCheck(): Promise<void> {
    // Mock health check
  }

  public async performFetch(_filters: EventFilters): Promise<NormalizedEvent[]> {
    return this.mockEvents;
  }

  protected requiresApiKey(): boolean {
    return false;
  }
}

describe("EventIngestionService", () => {
  let service: EventIngestionService;
  let mockEventbritePlugin: MockIngestionPlugin;
  let mockMeetupPlugin: MockIngestionPlugin;

  const mockEvents: NormalizedEvent[] = [
    {
      source: "eventbrite" as EventSourceType,
      externalId: "evt-001",
      title: "Test Event 1",
      description: "Test description",
      url: "https://example.com/event1",
      imageUrl: "https://example.com/image1.jpg",
      startTime: new Date(Date.now() + 86400000),
      endTime: new Date(Date.now() + 90000000),
      location: {
        name: "Test Venue",
        lat: 25.0805,
        lng: 55.1402,
        isVirtual: false,
      },
      category: "Technology",
      tags: ["test", "tech"],
    },
    {
      source: "eventbrite" as EventSourceType,
      externalId: "evt-002",
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

  beforeEach(() => {
    // Clear the registry
    const allPlugins = pluginRegistry.getAllPlugins();
    for (const plugin of allPlugins) {
      pluginRegistry.unregister(plugin.source);
    }

    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock return values
    jest.spyOn(dbQueries, "getActiveEventSources").mockResolvedValue([
      {
        id: "eventbrite-source-id",
        name: "Eventbrite",
        slug: "eventbrite",
        api_config: { endpoint: "https://www.eventbriteapi.com" },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "meetup-source-id",
        name: "Meetup",
        slug: "meetup",
        api_config: { endpoint: "https://www.meetup.com/gql" },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ] as never);

    // Mock upsertEvents to return the events passed to it
    jest.spyOn(dbQueries, "upsertEvents").mockImplementation(
      (events: unknown[]) =>
        Promise.resolve(
          events.map((evt: any, i: number) => ({ ...evt, id: `db-id-${i}` }))
        )
    );

    // Create mock plugins
    mockEventbritePlugin = new MockIngestionPlugin(
      "eventbrite" as EventSourceType,
      mockEvents,
      createConfig()
    );
    mockMeetupPlugin = new MockIngestionPlugin(
      "meetup" as EventSourceType,
      [], // No events from meetup
      createConfig()
    );

    // Register plugins
    pluginRegistry.register(mockEventbritePlugin);
    pluginRegistry.register(mockMeetupPlugin);

    // Create service
    service = new EventIngestionService(pluginRegistry);
  });

  describe("initialization", () => {
    it("should initialize with registry", () => {
      expect(service).toBeDefined();
    });

    it("should have getStats method", () => {
      expect(typeof service.getStats).toBe("function");
    });

    it("should have clearStats method", () => {
      expect(typeof service.clearStats).toBe("function");
    });

    it("should have getHealthStatus method", () => {
      expect(typeof service.getHealthStatus).toBe("function");
    });

    it("should have syncWithDatabase method", () => {
      expect(typeof service.syncWithDatabase).toBe("function");
    });
  });

  describe("ingestFromSource", () => {
    it("should ingest events from a specific source", async () => {
      const result = await service.ingestFromSource(
        "eventbrite" as EventSourceType,
        "eventbrite-source-id"
      );

      expect(result.source).toBe("eventbrite");
      expect(result.success).toBe(true);
      expect(result.eventsFetched).toBe(2);
      expect(result.eventsStored).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should call upsertEvents with correct data", async () => {
      await service.ingestFromSource(
        "eventbrite" as EventSourceType,
        "eventbrite-source-id"
      );

      const upsertMock = dbQueries.upsertEvents as jest.Mock;
      expect(upsertMock).toHaveBeenCalled();
      const upsertCall = upsertMock.mock.calls[0] as [unknown[], ...any[]];
      const events = upsertCall[0];

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        source_id: "eventbrite-source-id",
        external_id: "evt-001",
        title: "Test Event 1",
      });
    });

    it("should handle source with no events", async () => {
      const result = await service.ingestFromSource(
        "meetup" as EventSourceType,
        "meetup-source-id"
      );

      expect(result.source).toBe("meetup");
      expect(result.success).toBe(true);
      expect(result.eventsFetched).toBe(0);
      expect(result.eventsStored).toBe(0);
    });

    it("should handle plugin not found", async () => {
      const result = await service.ingestFromSource(
        "luma" as EventSourceType,
        "luma-source-id"
      );

      expect(result.source).toBe("luma");
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("No plugin registered");
    });

    it("should handle upsertEvents error", async () => {
      (dbQueries.upsertEvents as jest.Mock).mockRejectedValue(
        new Error("Database error") as never
      );

      const result = await service.ingestFromSource(
        "eventbrite" as EventSourceType,
        "eventbrite-source-id"
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Database error");
    });
  });

  describe("ingest", () => {
    it("should ingest from all enabled sources", async () => {
      const result = await service.ingest();

      expect(result.sources).toHaveLength(2);
      expect(result.totalEventsFetched).toBe(2);
      expect(result.totalEventsStored).toBe(2);
      expect(result.totalErrors).toBe(0);
    });

    it("should filter to specific sources when provided", async () => {
      const config: IngestionConfig = {
        sources: ["eventbrite" as EventSourceType],
      };

      const result = await service.ingest(config);

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].source).toBe("eventbrite");
    });

    it("should continue on error when configured", async () => {
      // Make meetup fail
      const badPlugin = new MockIngestionPlugin(
        "meetup" as EventSourceType,
        [],
        createConfig()
      );
      // Override validateConfig to fail
      badPlugin.validateConfig = async () => false;
      // Unregister existing meetup plugin first
      pluginRegistry.unregister("meetup" as EventSourceType);
      pluginRegistry.register(badPlugin);

      const config: IngestionConfig = {
        continueOnError: true,
      };

      const result = await service.ingest(config);

      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.totalErrors).toBeGreaterThan(0);
    });

    it("should stop on error when continueOnError is false", async () => {
      // Make eventbrite fail
      const badPlugin = new MockIngestionPlugin(
        "eventbrite" as EventSourceType,
        [],
        createConfig()
      );
      badPlugin.validateConfig = async () => false;
      // Unregister existing eventbrite plugin first
      pluginRegistry.unregister("eventbrite" as EventSourceType);
      pluginRegistry.register(badPlugin);

      const result = await service.ingest({ continueOnError: false });

      // Should still have results but with errors
      expect(result.sources.length).toBeGreaterThan(0);
    });
  });

  describe("batch processing", () => {
    it("should process events in batches when batchSize is set", async () => {
      const largeEventList: NormalizedEvent[] = [];
      for (let i = 0; i < 250; i++) {
        largeEventList.push({
          ...mockEvents[0],
          externalId: `evt-${i}`,
        });
      }

      const batchPlugin = new MockIngestionPlugin(
        "eventbrite" as EventSourceType,
        largeEventList,
        createConfig()
      );
      // Unregister existing eventbrite plugin first
      pluginRegistry.unregister("eventbrite" as EventSourceType);
      pluginRegistry.register(batchPlugin);

      const config: IngestionConfig = {
        batchSize: 50,
      };

      await service.ingestFromSource(
        "eventbrite" as EventSourceType,
        "eventbrite-source-id",
        config
      );

      const upsertMock = dbQueries.upsertEvents as jest.Mock;
      // Should be called 5 times with 50 events each
      expect(upsertMock).toHaveBeenCalledTimes(5);
    });
  });

  describe("filters", () => {
    it("should pass filters to plugin when fetching", async () => {
      const fetchSpy = jest.spyOn(mockEventbritePlugin, "fetchEvents");

      const filters: EventFilters = {
        location: { lat: 25.0805, lng: 55.1402, radiusKm: 50 },
        limit: 10,
      };

      await service.ingestFromSource(
        "eventbrite" as EventSourceType,
        "eventbrite-source-id",
        { filters }
      );

      expect(fetchSpy).toHaveBeenCalledWith(filters);
    });
  });
});
