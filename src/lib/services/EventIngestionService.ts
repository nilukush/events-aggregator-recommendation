/**
 * Event Ingestion Service
 *
 * Orchestrates fetching events from all enabled plugins
 * and storing them in the database
 *
 * This service:
 * - Fetches events from all enabled event source plugins
 * - Normalizes and stores events in the database
 * - Handles duplicates via upsert
 * - Tracks ingestion statistics
 * - Provides logging and error reporting
 */

import { pluginRegistry } from "../plugins/PluginRegistry";
import type { EventFilters, NormalizedEvent, EventSourceType } from "../plugins/types";
import type {
  DbEventInsert,
  DbEventSource,
} from "../db/schema";
import {
  getActiveEventSources,
  upsertEvents,
  getEventSourceBySlug,
} from "../db/queries";
import { normalizedEventToDbInsert } from "../db/converters";

/**
 * Ingestion result for a single source
 */
export interface SourceIngestionResult {
  source: EventSourceType;
  success: boolean;
  eventsFetched: number;
  eventsStored: number;
  errors: string[];
  durationMs: number;
}

/**
 * Overall ingestion result
 */
export interface IngestionResult {
  sources: SourceIngestionResult[];
  totalEventsFetched: number;
  totalEventsStored: number;
  totalErrors: number;
  durationMs: number;
}

/**
 * Ingestion configuration
 */
export interface IngestionConfig {
  sources?: EventSourceType[]; // Specific sources to ingest (empty = all enabled)
  filters?: EventFilters; // Filters to apply when fetching
  batchSize?: number; // Batch size for database upserts
  continueOnError?: boolean; // Continue if a source fails
}

/**
 * Event Ingestion Service
 */
export class EventIngestionService {
  private registry: typeof pluginRegistry;
  private defaultBatchSize = 100;

  constructor(registry: typeof pluginRegistry = pluginRegistry) {
    this.registry = registry;
  }

  /**
   * Ingest events from all enabled sources
   */
  async ingest(config: IngestionConfig = {}): Promise<IngestionResult> {
    const startTime = Date.now();
    const results: SourceIngestionResult[] = [];

    // Get active event sources from database
    const dbSources = await getActiveEventSources();
    const sourceMap = new Map<string, DbEventSource>();
    for (const source of dbSources) {
      sourceMap.set(source.slug, source);
    }

    // Determine which sources to ingest
    const sourcesToIngest = config.sources
      ? config.sources
      : this.getEnabledSourcesFromDb(dbSources);

    // Ingest from each source
    for (const source of sourcesToIngest) {
      const sourceId = sourceMap.get(source)?.id;

      if (!sourceId) {
        console.warn(`Source ${source} not found in database, skipping`);
        continue;
      }

      const result = await this.ingestFromSource(source, sourceId, config);
      results.push(result);

      // Stop if critical error and not continuing on error
      if (!result.success && !config.continueOnError) {
        break;
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      sources: results,
      totalEventsFetched: results.reduce((sum, r) => sum + r.eventsFetched, 0),
      totalEventsStored: results.reduce((sum, r) => sum + r.eventsStored, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      durationMs,
    };
  }

  /**
   * Ingest events from a specific source
   */
  async ingestFromSource(
    source: EventSourceType,
    sourceId: string,
    config: IngestionConfig = {}
  ): Promise<SourceIngestionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let eventsFetched = 0;
    let eventsStored = 0;
    let success = true;

    try {
      // Get the plugin for this source
      const plugin = this.registry.getPlugin(source);
      if (!plugin) {
        throw new Error(`No plugin registered for source: ${source}`);
      }

      // Validate plugin config
      const isValid = await plugin.validateConfig();
      if (!isValid) {
        throw new Error(`Plugin configuration is invalid for: ${source}`);
      }

      // Fetch events from the plugin
      const events = await plugin.fetchEvents(config.filters || {});
      eventsFetched = events.length;

      if (events.length === 0) {
        console.info(`No events fetched from ${source}`);
        return {
          source,
          success: true,
          eventsFetched: 0,
          eventsStored: 0,
          errors: [],
          durationMs: Date.now() - startTime,
        };
      }

      // Convert to DbEventInsert format
      const dbEvents = events.map((event) =>
        normalizedEventToDbInsert(event, sourceId)
      );

      // Store in batches
      const batchSize = config.batchSize || this.defaultBatchSize;
      for (let i = 0; i < dbEvents.length; i += batchSize) {
        const batch = dbEvents.slice(i, i + batchSize);
        const stored = await upsertEvents(batch);
        eventsStored += stored.length;
      }

      console.info(
        `Ingested ${eventsStored} events from ${source} (${eventsFetched} fetched)`
      );
    } catch (error) {
      success = false;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      console.error(`Error ingesting from ${source}:`, errorMessage);
    }

    return {
      source,
      success,
      eventsFetched,
      eventsStored,
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Get enabled sources from database
   */
  private getEnabledSourcesFromDb(
    dbSources: DbEventSource[]
  ): EventSourceType[] {
    const enabledPlugins = this.registry.getEnabledPlugins();
    const enabledSources = new Set(
      enabledPlugins.map((p) => p.source)
    );

    // Return sources that are both in database and have enabled plugins
    return dbSources
      .filter((source) => enabledSources.has(source.slug as EventSourceType))
      .map((source) => source.slug as EventSourceType);
  }

  /**
   * Get ingestion statistics from the registry
   */
  getStats() {
    return this.registry.getIngestionStats();
  }

  /**
   * Clear ingestion statistics
   */
  clearStats(): void {
    this.registry.clearStats();
  }

  /**
   * Get health status for all plugins
   */
  async getHealthStatus() {
    return await this.registry.getHealthStatus();
  }

  /**
   * Sync plugins with database event sources
   */
  async syncWithDatabase(): Promise<void> {
    await this.registry.syncWithDatabase();
  }
}

/**
 * Singleton instance
 */
export const eventIngestionService = new EventIngestionService();
