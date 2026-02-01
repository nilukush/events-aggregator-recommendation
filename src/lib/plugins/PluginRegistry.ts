/**
 * Plugin Registry
 *
 * Manages event source plugins, handles registration, discovery,
 * and provides a unified interface for fetching events from all sources
 */

import type {
  IEventSourcePlugin,
  EventFilters,
  NormalizedEvent,
  EventSourceType,
  PluginHealthStatus,
  IngestionStats,
} from "./types";

/**
 * Plugin Registry class
 * Manages all event source plugins
 */
export class PluginRegistry {
  private plugins: Map<EventSourceType, IEventSourcePlugin> = new Map();
  private ingestionStats: Map<EventSourceType, IngestionStats> = new Map();

  /**
   * Register a plugin
   * @throws Error if plugin already registered
   */
  register(plugin: IEventSourcePlugin): void {
    if (this.plugins.has(plugin.source)) {
      throw new Error(`Plugin for ${plugin.source} is already registered`);
    }

    this.plugins.set(plugin.source, plugin);
    console.info(`Registered plugin: ${plugin.name} (${plugin.source})`);
  }

  /**
   * Unregister a plugin
   */
  unregister(source: EventSourceType): void {
    this.plugins.delete(source);
    console.info(`Unregistered plugin: ${source}`);
  }

  /**
   * Get a plugin by source type
   */
  getPlugin(source: EventSourceType): IEventSourcePlugin | undefined {
    return this.plugins.get(source);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): IEventSourcePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all enabled plugins
   */
  getEnabledPlugins(): IEventSourcePlugin[] {
    return this.getAllPlugins().filter((plugin) => {
      // Check if plugin config is enabled
      if ("config" in plugin && "enabled" in (plugin as any).config) {
        return (plugin as any).config.enabled;
      }
      return true;
    });
  }

  /**
   * Check if a plugin is registered
   */
  has(source: EventSourceType): boolean {
    return this.plugins.has(source);
  }

  /**
   * Get health status for all plugins
   */
  async getHealthStatus(): Promise<Map<EventSourceType, PluginHealthStatus>> {
    const healthMap = new Map<EventSourceType, PluginHealthStatus>();

    for (const plugin of this.getAllPlugins()) {
      try {
        const status = await plugin.healthCheck();
        healthMap.set(plugin.source, status);
      } catch (error) {
        healthMap.set(plugin.source, {
          isHealthy: false,
          lastCheckAt: new Date(),
          lastError: {
            code: "HEALTH_CHECK_FAILED",
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    return healthMap;
  }

  /**
   * Fetch events from all enabled plugins
   * @returns Array of events from all sources
   */
  async fetchFromAllPlugins(filters: EventFilters): Promise<NormalizedEvent[]> {
    const enabledPlugins = this.getEnabledPlugins();
    const allEvents: NormalizedEvent[] = [];

    for (const plugin of enabledPlugins) {
      try {
        const events = await this.fetchFromPlugin(plugin, filters);
        allEvents.push(...events);
      } catch (error) {
        console.error(`Error fetching from ${plugin.name}:`, error);
        // Record error in stats
        this.updateStats(plugin.source, 0, 1, 0, [
          {
            code: "FETCH_ERROR",
            message: error instanceof Error ? error.message : String(error),
          },
        ]);
      }
    }

    return allEvents;
  }

  /**
   * Fetch events from a specific plugin by source type
   */
  async fetchFromSource(
    source: EventSourceType,
    filters: EventFilters
  ): Promise<NormalizedEvent[]> {
    const plugin = this.getPlugin(source);

    if (!plugin) {
      throw new Error(`No plugin registered for source: ${source}`);
    }

    return this.fetchFromPlugin(plugin, filters);
  }

  /**
   * Fetch events from a specific plugin instance
   */
  async fetchFromPlugin(
    plugin: IEventSourcePlugin,
    filters: EventFilters
  ): Promise<NormalizedEvent[]> {
    const startTime = Date.now();

    try {
      const events = await plugin.fetchEvents(filters);
      const duration = Date.now() - startTime;

      // Record successful stats
      this.updateStats(plugin.source, events.length, 0, duration, []);

      return events;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record error stats
      this.updateStats(plugin.source, 0, 1, duration, [
        {
          code: "FETCH_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      ]);

      throw error;
    }
  }

  /**
   * Get ingestion statistics for all plugins
   */
  getIngestionStats(): IngestionStats[] {
    return Array.from(this.ingestionStats.values());
  }

  /**
   * Get ingestion statistics for a specific source
   */
  getStatsForSource(source: EventSourceType): IngestionStats | undefined {
    return this.ingestionStats.get(source);
  }

  /**
   * Update ingestion statistics
   */
  private updateStats(
    source: EventSourceType,
    successCount: number,
    errorCount: number,
    duration: number,
    errors: Array<{ code: string; message: string }>
  ): void {
    const existing = this.ingestionStats.get(source);

    this.ingestionStats.set(source, {
      source,
      successCount: (existing?.successCount || 0) + successCount,
      errorCount: (existing?.errorCount || 0) + errorCount,
      lastRunAt: new Date(),
      durationMs: duration,
      errors: [...(existing?.errors || []), ...errors].slice(-10), // Keep last 10 errors
    });
  }

  /**
   * Clear all statistics
   */
  clearStats(): void {
    this.ingestionStats.clear();
  }

  /**
   * Initialize plugins from database configuration
   * Loads active event sources and creates appropriate plugins
   */
  async initializeFromDatabase(): Promise<void> {
    const { getActiveEventSources } = await import("../db/queries");
    const sources = await getActiveEventSources();

    for (const source of sources) {
      // Skip if plugin already registered
      if (this.has(source.slug as EventSourceType)) {
        continue;
      }

      // Plugins will be registered by their respective implementation modules
      // This method just verifies the sources exist in the database
      console.info(`Found event source in database: ${source.name} (${source.slug})`);
    }
  }

  /**
   * Synchronize plugins with database event sources
   */
  async syncWithDatabase(): Promise<void> {
    const { getActiveEventSources } = await import("../db/queries");
    const enabledPlugins = this.getEnabledPlugins();
    const dbSources = await getActiveEventSources();

    // Log any plugins that are enabled but not in database
    for (const plugin of enabledPlugins) {
      const existsInDb = dbSources.some((s: { slug: string }) => s.slug === plugin.source);
      if (!existsInDb) {
        console.warn(`Plugin ${plugin.name} (${plugin.source}) is enabled but not found in database`);
      }
    }
  }
}

/**
 * Global plugin registry instance
 */
export const pluginRegistry = new PluginRegistry();
