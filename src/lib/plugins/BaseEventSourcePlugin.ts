/**
 * Base Event Source Plugin
 *
 * Provides common functionality for all event source plugins:
 * - Rate limiting
 * - Retry logic with exponential backoff
 * - Error handling
 * - Configuration management
 */

import type {
  IEventSourcePlugin,
  EventFilters,
  NormalizedEvent,
  RateLimitStatus,
  PluginHealthStatus,
  PluginConfig,
  ApiError,
  EventSourceType,
  Location,
} from "./types";

/**
 * Abstract base class for event source plugins
 * Implement this class to create a new event source plugin
 */
export abstract class BaseEventSourcePlugin implements IEventSourcePlugin {
  protected rateLimit: RateLimitStatus;
  protected lastHealthCheck: PluginHealthStatus | null = null;

  constructor(
    public readonly name: string,
    public readonly version: string,
    public readonly source: EventSourceType,
    public readonly config: PluginConfig = {
      enabled: true,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    }
  ) {
    this.rateLimit = this.initializeRateLimit();
  }

  /**
   * Initialize default rate limit status
   * Override this in your plugin to set platform-specific limits
   */
  protected initializeRateLimit(): RateLimitStatus {
    return {
      limit: Infinity,
      remaining: Infinity,
      resetAt: null,
      windowMs: 60000,
    };
  }

  /**
   * Validate the plugin configuration
   * Override this to add custom validation logic
   */
  async validateConfig(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    if (this.requiresApiKey() && !this.config.apiKey && !this.config.oauthToken) {
      console.warn(`${this.name}: API key or OAuth token is missing`);
      return false;
    }

    return true;
  }

  /**
   * Check if this plugin requires an API key
   * Override to return true if your plugin needs authentication
   */
  protected requiresApiKey(): boolean {
    return true;
  }

  /**
   * Health check implementation
   */
  async healthCheck(): Promise<PluginHealthStatus> {
    const startTime = Date.now();

    try {
      await this.validateConfig();
      await this.performHealthCheck();

      const status: PluginHealthStatus = {
        isHealthy: true,
        lastCheckAt: new Date(),
        responseTimeMs: Date.now() - startTime,
      };

      this.lastHealthCheck = status;
      return status;
    } catch (error) {
      const apiError = this.handleError(error as Error);
      const status: PluginHealthStatus = {
        isHealthy: false,
        lastCheckAt: new Date(),
        lastError: apiError,
        responseTimeMs: Date.now() - startTime,
      };

      this.lastHealthCheck = status;
      return status;
    }
  }

  /**
   * Perform the actual health check
   * Override this in your plugin
   */
  protected abstract performHealthCheck(): Promise<void>;

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus {
    return { ...this.rateLimit };
  }

  /**
   * Fetch events with automatic retry and rate limit handling
   */
  async fetchEvents(filters: EventFilters): Promise<NormalizedEvent[]> {
    await this.waitForRateLimit();

    const maxRetries = this.config.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const events = await this.performFetch(filters);
        return events;
      } catch (error) {
        lastError = error as Error;
        const apiError = this.handleError(lastError);

        if (!apiError.isRetryable || attempt === maxRetries) {
          throw apiError;
        }

        const delay = this.calculateRetryDelay(attempt);
        console.warn(`${this.name}: Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Perform the actual event fetch from the platform
   * Override this in your plugin
   */
  abstract performFetch(filters: EventFilters): Promise<NormalizedEvent[]>;

  /**
   * Update rate limit status after a request
   */
  protected updateRateLimitFromResponse(_response: Response): void {
    // Override in plugins to parse rate limit headers
  }

  /**
   * Wait for rate limit to reset if necessary
   */
  protected async waitForRateLimit(): Promise<void> {
    if (this.rateLimit.remaining <= 0 && this.rateLimit.resetAt) {
      const now = Date.now();
      const resetTime = this.rateLimit.resetAt.getTime();
      const waitTime = Math.max(0, resetTime - now);

      if (waitTime > 0) {
        console.warn(`${this.name}: Rate limited, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
        this.rateLimit.remaining = this.rateLimit.limit;
      }
    }
  }

  /**
   * Decrement rate limit counter
   */
  protected decrementRateLimit(): void {
    if (this.rateLimit.remaining > 0) {
      this.rateLimit.remaining--;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  protected calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay || 1000;
    return baseDelay * Math.pow(2, attempt);
  }

  /**
   * Handle and normalize errors
   */
  protected handleError(error: Error): ApiError {
    const apiError: ApiError = {
      code: "UNKNOWN_ERROR",
      message: error.message,
      details: error,
      isRetryable: true,
    };

    if (error.message.includes("rate limit") || error.message.includes("429")) {
      apiError.code = "RATE_LIMITED";
      apiError.isRetryable = true;
    } else if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
      apiError.code = "TIMEOUT";
      apiError.isRetryable = true;
    } else if (error.message.includes("ENOTFOUND") || error.message.includes("404")) {
      apiError.code = "NOT_FOUND";
      apiError.isRetryable = false;
    } else if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("401") ||
      error.message.includes("403")
    ) {
      apiError.code = "AUTH_ERROR";
      apiError.isRetryable = false;
    }

    return apiError;
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Normalize location data from platform format
   * Helper method for plugins (public for testing)
   */
  normalizeLocation(locationData: {
    venue_name?: string;
    venue_address?: string;
    lat?: number | string;
    lng?: number | string;
    longitude?: number | string;
    is_online?: boolean;
    virtual?: boolean;
  }): Location {
    const lat = locationData.lat
      ? typeof locationData.lat === "string"
        ? parseFloat(locationData.lat)
        : locationData.lat
      : locationData.longitude
        ? typeof locationData.longitude === "string"
          ? parseFloat(locationData.longitude)
          : locationData.longitude
        : undefined;

    const lng = locationData.lng
      ? typeof locationData.lng === "string"
        ? parseFloat(locationData.lng)
        : locationData.lng
      : undefined;

    const isVirtual = locationData.is_online || locationData.virtual || false;

    return {
      name: locationData.venue_name || locationData.venue_address,
      lat,
      lng,
      isVirtual,
    };
  }

  /**
   * Normalize date/time from platform format
   * Helper method for plugins (public for testing)
   */
  normalizeDateTime(dateTime: string | Date): Date {
    if (dateTime instanceof Date) {
      return dateTime;
    }
    return new Date(dateTime);
  }

  /**
   * Extract category from event data
   * Helper method for plugins (public for testing)
   */
  extractCategory(
    eventData: Record<string, unknown>,
    categories: string[]
  ): string | null {
    for (const category of categories) {
      if (category in eventData && eventData[category]) {
        const value = String(eventData[category]);
        if (value && value !== "" && value !== "null" && value !== "undefined") {
          return value;
        }
      }
    }
    return null;
  }
}
