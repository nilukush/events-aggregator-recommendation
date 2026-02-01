/**
 * Plugin System Type Definitions
 */

import type { EventSourceType } from "../../types/index";

// Re-export EventSourceType for convenience
export type { EventSourceType };

/**
 * Geographic location for events
 */
export interface Location {
  name?: string;
  lat?: number;
  lng?: number;
  isVirtual: boolean;
}

/**
 * Normalized event structure from any source plugin
 */
export interface NormalizedEvent {
  id?: string; // Database ID (optional for new events)
  source: EventSourceType;
  externalId: string;
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  startTime: Date;
  endTime: Date | null;
  location: Location;
  category: string | null;
  tags: string[];
  rawData?: unknown;
}

/**
 * Event filters for fetching events from plugins
 */
export interface EventFilters {
  location?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  query?: string;
  virtualOnly?: boolean;
  limit?: number;
  city?: string; // For city-based scrapers (e.g., Luma)
}

/**
 * Rate limit status from API
 */
export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetAt: Date | null;
  windowMs?: number; // Time window for rate limit in milliseconds
}

/**
 * API error types
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  isRetryable?: boolean;
}

/**
 * Plugin health status
 */
export interface PluginHealthStatus {
  isHealthy: boolean;
  lastCheckAt: Date;
  lastError?: ApiError;
  responseTimeMs?: number;
}

/**
 * Rate limit configuration for plugins
 */
export interface RateLimitConfig {
  limit: number;      // Maximum requests per time window
  windowMs: number;   // Time window in milliseconds
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  oauthToken?: string;
  baseUrl?: string;
  timeout?: number; // Request timeout in milliseconds
  maxRetries?: number;
  retryDelay?: number; // Initial retry delay in milliseconds
  rateLimit?: RateLimitConfig; // Custom rate limit (for scrapers)
}

/**
 * Ingestion statistics
 */
export interface IngestionStats {
  source: EventSourceType;
  successCount: number;
  errorCount: number;
  lastRunAt: Date;
  durationMs: number;
  errors: ApiError[];
}

/**
 * Event source plugin interface
 * All event source plugins must implement this interface
 */
export interface IEventSourcePlugin {
  /** Unique name of the plugin */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  /** Source platform type */
  readonly source: EventSourceType;

  /**
   * Check if the plugin and its API are healthy
   */
  healthCheck(): Promise<PluginHealthStatus>;

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus;

  /**
   * Fetch events from the platform
   * @param filters - Filters to apply to event search
   * @returns Array of normalized events
   */
  fetchEvents(filters: EventFilters): Promise<NormalizedEvent[]>;

  /**
   * Validate plugin configuration
   */
  validateConfig(): Promise<boolean>;
}
