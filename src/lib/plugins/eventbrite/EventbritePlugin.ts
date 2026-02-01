/**
 * Eventbrite Event Source Plugin
 *
 * Fetches events from the Eventbrite API
 * API Documentation: https://www.eventbrite.com/platform/api/
 */

import { BaseEventSourcePlugin } from "../BaseEventSourcePlugin";
import type {
  EventFilters,
  NormalizedEvent,
  PluginConfig,
  RateLimitStatus,
} from "../types";

/**
 * Eventbrite API response types
 */
interface EventbriteEvent {
  id: string;
  name: { text: string };
  description: { text: string | null };
  url: string;
  logo: { url: string | null } | null;
  start: { utc: string; local: string; timezone: string };
  end: { utc: string | null; local: string | null; timezone: string } | null;
  venue: {
    name: string;
    address: {
      address_1: string | null;
      address_2: string | null;
      city: string | null;
      region: string | null;
      postal_code: string | null;
      country: string | null;
      latitude: number | null;
      longitude: number | null;
    } | null;
  } | null;
  online_event: boolean;
  category: string | null;
  subcategory: string | null;
  tags: string[] | null;
  privacy: string;
}

interface EventbritePagination {
  object_count: number;
  page_number: number;
  page_size: number;
  page_count: number;
  has_more_items: boolean;
}

interface EventbriteEventsResponse {
  events: EventbriteEvent[];
  pagination: EventbritePagination;
}

interface EventbriteErrorResponse {
  error: string;
  error_description: string;
  status_code: number;
}

/**
 * Eventbrite API configuration
 */
const EVENTBRITE_BASE_URL = "https://www.eventbriteapi.com/v3";
const EVENTBRITE_RATE_LIMIT = 1000; // requests per hour for OAuth tokens
const EVENTBRITE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Eventbrite Plugin Class
 */
export class EventbritePlugin extends BaseEventSourcePlugin {
  private baseUrl: string;

  constructor(config: PluginConfig = {
    enabled: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  }) {
    super(
      "Eventbrite",
      "1.0.0",
      "eventbrite",
      config
    );
    this.baseUrl = config.baseUrl || EVENTBRITE_BASE_URL;
  }

  /**
   * Initialize Eventbrite-specific rate limits
   */
  protected initializeRateLimit(): RateLimitStatus {
    return {
      limit: EVENTBRITE_RATE_LIMIT,
      remaining: EVENTBRITE_RATE_LIMIT,
      resetAt: null,
      windowMs: EVENTBRITE_WINDOW_MS,
    };
  }

  /**
   * Eventbrite requires an OAuth token or API key
   */
  protected requiresApiKey(): boolean {
    return true;
  }

  /**
   * Perform health check by making a test request
   */
  protected async performHealthCheck(): Promise<void> {
    const response = await this.fetchFromEndpoint(
      `/users/me/owned_events/?limit=1`
    );

    if (!response.ok) {
      const error = (await response.json()) as EventbriteErrorResponse;
      throw new Error(error.error_description || error.error);
    }
  }

  /**
   * Fetch events from Eventbrite
   */
  public async performFetch(filters: EventFilters): Promise<NormalizedEvent[]> {
    const events: NormalizedEvent[] = [];
    let hasMore = true;
    let page = 1;
    const pageSize = Math.min(filters.limit || 50, 50);

    while (hasMore && events.length < (filters.limit || 1000)) {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        "status": "live", // Only published events
        "order_by": "start_asc", // Order by start date
      });

      // Add location filter
      if (filters.location) {
        params.append(
          "location.address",
          `${filters.location.lat},${filters.location.lng}`
        );
        params.append(
          "location.within",
          `${filters.location.radiusKm}km`
        );
      }

      // Add category filter (Eventbrite uses specific category IDs)
      if (filters.categories && filters.categories.length > 0) {
        params.append("categories", filters.categories.join(","));
      }

      // Add keyword search
      if (filters.query) {
        params.append("q", filters.query);
      }

      // Add date range
      if (filters.startDate) {
        params.append("start_date.range_start", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.append("start_date.range_end", filters.endDate.toISOString());
      }

      // Only virtual events if requested
      if (filters.virtualOnly) {
        params.append("online_event", "online_event_only");
      }

      const response = await this.fetchFromEndpoint(
        `/events/search/?${params.toString()}`
      );

      // Update rate limit from response headers
      this.updateRateLimitFromResponse(response);

      if (!response.ok) {
        const error = (await response.json()) as EventbriteErrorResponse;
        throw new Error(error.error_description || error.error);
      }

      const data = (await response.json()) as EventbriteEventsResponse;
      const normalizedEvents = this.normalizeEvents(data.events);
      events.push(...normalizedEvents);

      hasMore = data.pagination.has_more_items;
      page++;

      // Stop if we've collected enough events
      const remaining = (filters.limit || 1000) - events.length;
      if (remaining <= 0) {
        break;
      }
    }

    return events;
  }

  /**
   * Fetch from Eventbrite API endpoint with authentication
   */
  private async fetchFromEndpoint(
    path: string
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const token = this.config.oauthToken || this.config.apiKey;

    if (!token) {
      throw new Error("Eventbrite OAuth token or API key is required");
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeout || 30000
    );

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      this.decrementRateLimit();
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Update rate limit from response headers
   * Eventbrite returns rate limit info in headers:
   * - X-EB-RateLimit-Limit: Max requests per window
   * - X-EB-RateLimit-Remaining: Remaining requests
   * - X-EB-RateLimit-Reset: Unix timestamp when limit resets
   */
  protected updateRateLimitFromResponse(response: Response): void {
    const limit = response.headers.get("X-EB-RateLimit-Limit");
    const remaining = response.headers.get("X-EB-RateLimit-Remaining");
    const reset = response.headers.get("X-EB-RateLimit-Reset");

    if (limit) {
      this.rateLimit.limit = parseInt(limit, 10);
    }
    if (remaining) {
      this.rateLimit.remaining = parseInt(remaining, 10);
    }
    if (reset) {
      this.rateLimit.resetAt = new Date(parseInt(reset, 10) * 1000);
    }
  }

  /**
   * Normalize Eventbrite events to standard format
   */
  private normalizeEvents(events: EventbriteEvent[]): NormalizedEvent[] {
    return events.map((event) => this.normalizeEvent(event));
  }

  /**
   * Normalize a single Eventbrite event
   */
  private normalizeEvent(event: EventbriteEvent): NormalizedEvent {
    const venue = event.venue;
    const address = venue?.address;

    // Determine if virtual
    const isVirtual = event.online_event || !venue;

    // Extract category
    const category = event.category || event.subcategory;

    // Extract tags
    const tags: string[] = [];
    if (event.tags && Array.isArray(event.tags)) {
      tags.push(...event.tags);
    }
    if (category) {
      tags.push(category);
    }
    if (event.subcategory && event.subcategory !== category) {
      tags.push(event.subcategory);
    }

    return {
      source: this.source,
      externalId: event.id,
      title: event.name.text,
      description: event.description?.text || null,
      url: event.url,
      imageUrl: event.logo?.url || null,
      startTime: this.normalizeDateTime(event.start.utc),
      endTime: event.end?.utc ? this.normalizeDateTime(event.end.utc) : null,
      location: {
        name: venue?.name || (isVirtual ? "Online Event" : address?.address_1 || undefined),
        lat: address?.latitude || undefined,
        lng: address?.longitude || undefined,
        isVirtual,
      },
      category,
      tags: [...new Set(tags)], // Remove duplicates
      rawData: event,
    };
  }
}
