/**
 * Meetup Event Source Plugin
 *
 * Fetches events from the Meetup GraphQL API
 * API Documentation: https://www.meetup.com/api/meetup/gql/
 * GraphQL Explorer: https://www.meetup.com/api/graphql/
 *
 * Meetup uses OAuth 2.0 for authentication
 * Rate limit: 500 requests per 60 seconds
 */

import { BaseEventSourcePlugin } from "../BaseEventSourcePlugin";
import type {
  EventFilters,
  NormalizedEvent,
  PluginConfig,
  RateLimitStatus,
} from "../types";

/**
 * Meetup GraphQL response types
 */
interface MeetupGraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code?: string;
    };
  }>;
}

interface MeetupEvent {
  id: string;
  title: string;
  description: string;
  eventUrl: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string | null;
  timezone: string;
  venue: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    lat: number;
    lng: number;
  } | null;
  isOnline: boolean;
  onlineEventUrl: string | null;
  host: {
    id: string;
    name: string;
  } | null;
  group: {
    id: string;
    name: string;
    urlname: string;
    category: {
      id: string;
      name: string;
      categorySets: Array<{
        name: string;
        sortName: string;
      }>;
    } | null;
  } | null;
  eventType: string;
  going: number;
}

interface MeetupEventsVariables {
  first: number;
  after: string | null;
  query: string | null;
  lat: number | null;
  lng: number | null;
  radius: number | null;
  startDate: string | null;
  endDate: string | null;
  isOnline: boolean | null;
}

/**
 * Meetup API configuration
 */
const MEETUP_GRAPHQL_URL = "https://www.meetup.com/gql";
const MEETUP_RATE_LIMIT = 500; // requests per 60 seconds
const MEETUP_WINDOW_MS = 60 * 1000; // 60 seconds

/**
 * GraphQL query for finding events
 */
const FIND_EVENTS_QUERY = `
query FindEvents(
  $first: Int!
  $after: String
  $query: String
  $lat: Float
  $lng: Float
  $radius: Float
  $startDate: DateTime
  $endDate: DateTime
  $isOnline: Boolean
) {
  findEvents(
    input: {
      first: $first
      after: $after
      query: $query
      lat: $lat
      lng: $lng
      radius: $radius
      startDate: $startDate
      endDate: $endDate
      isOnline: $isOnline
    }
  ) {
    count
    edges {
      node {
        id
        title
        description
        eventUrl
        imageUrl
        startDate
        endDate
        timezone
        venue {
          id
          name
          address
          city
          state
          country
          lat
          lng
        }
        isOnline
        onlineEventUrl
        host {
          id
          name
        }
        group {
          id
          name
          urlname
          category {
            id
            name
            categorySets {
              name
              sortName
            }
          }
        }
        eventType
        going
      }
      cursor
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}
`;

/**
 * Meetup Plugin Class
 */
export class MeetupPlugin extends BaseEventSourcePlugin {
  private graphqlUrl: string;

  constructor(config: PluginConfig = {
    enabled: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  }) {
    super(
      "Meetup",
      "1.0.0",
      "meetup",
      config
    );
    this.graphqlUrl = config.baseUrl || MEETUP_GRAPHQL_URL;
  }

  /**
   * Initialize Meetup-specific rate limits
   */
  protected initializeRateLimit(): RateLimitStatus {
    return {
      limit: MEETUP_RATE_LIMIT,
      remaining: MEETUP_RATE_LIMIT,
      resetAt: null,
      windowMs: MEETUP_WINDOW_MS,
    };
  }

  /**
   * Meetup requires an OAuth token
   */
  protected requiresApiKey(): boolean {
    return true;
  }

  /**
   * Perform health check by making a test query
   */
  protected async performHealthCheck(): Promise<void> {
    const response = await this.fetchGraphQL(
      FIND_EVENTS_QUERY,
      {
        first: 1,
        after: null,
        query: null,
        lat: null,
        lng: null,
        radius: null,
        startDate: null,
        endDate: null,
        isOnline: null,
      }
    );

    const data = await response.json();

    if (data.errors) {
      const error = data.errors[0];
      throw new Error(error.message || "Meetup API error");
    }
  }

  /**
   * Fetch events from Meetup
   */
  public async performFetch(filters: EventFilters): Promise<NormalizedEvent[]> {
    const events: NormalizedEvent[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    const pageSize = Math.min(filters.limit || 50, 100);

    while (hasNextPage && events.length < (filters.limit || 1000)) {
      const variables: MeetupEventsVariables = {
        first: pageSize,
        after: cursor,
        query: filters.query || null,
        lat: filters.location?.lat || null,
        lng: filters.location?.lng || null,
        radius: filters.location?.radiusKm || null,
        startDate: filters.startDate ? filters.startDate.toISOString() : null,
        endDate: filters.endDate ? filters.endDate.toISOString() : null,
        isOnline: filters.virtualOnly || null,
      };

      const response = await this.fetchGraphQL(
        FIND_EVENTS_QUERY,
        variables
      );

      // Update rate limit from response headers
      this.updateRateLimitFromResponse(response);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Meetup API error: ${error}`);
      }

      const data = (await response.json()) as MeetupGraphQLResponse<{
        findEvents: {
          edges: Array<{ node: MeetupEvent; cursor: string }>;
          pageInfo: { endCursor: string; hasNextPage: boolean };
        };
      }>;

      if (data.errors) {
        const error = data.errors[0];
        throw new Error(error.message || "Meetup API error");
      }

      const findEventsData = data.data?.findEvents;
      if (!findEventsData) {
        break;
      }

      const normalizedEvents = this.normalizeEvents(
        findEventsData.edges.map((e) => e.node)
      );
      events.push(...normalizedEvents);

      hasNextPage = findEventsData.pageInfo.hasNextPage;
      cursor = findEventsData.pageInfo.endCursor;

      // Stop if we've collected enough events
      const remaining = (filters.limit || 1000) - events.length;
      if (remaining <= 0 || !hasNextPage) {
        break;
      }
    }

    return events;
  }

  /**
   * Fetch from Meetup GraphQL API with authentication
   */
  private async fetchGraphQL(
    query: string,
    variables: MeetupEventsVariables
  ): Promise<Response> {
    const token = this.config.oauthToken || this.config.apiKey;

    if (!token) {
      throw new Error("Meetup OAuth token is required");
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeout || 30000
    );

    try {
      const response = await fetch(this.graphqlUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
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
   * Meetup returns rate limit info in headers:
   * - X-RateLimit-Limit: Max requests per window
   * - X-RateLimit-Remaining: Remaining requests
   * - X-RateLimit-Reset: Unix timestamp when limit resets
   */
  protected updateRateLimitFromResponse(response: Response): void {
    const limit = response.headers.get("X-RateLimit-Limit");
    const remaining = response.headers.get("X-RateLimit-Remaining");
    const reset = response.headers.get("X-RateLimit-Reset");

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
   * Normalize Meetup events to standard format
   */
  private normalizeEvents(events: MeetupEvent[]): NormalizedEvent[] {
    return events.map((event) => this.normalizeEvent(event));
  }

  /**
   * Normalize a single Meetup event
   */
  private normalizeEvent(event: MeetupEvent): NormalizedEvent {
    const venue = event.venue;

    // Determine if virtual
    const isVirtual = event.isOnline || !venue;

    // Extract category from group category
    const category = event.group?.category?.name || null;

    // Build tags
    const tags: string[] = [];

    // Add event type as tag
    if (event.eventType) {
      tags.push(event.eventType);
    }

    // Add category set names as tags
    if (event.group?.category?.categorySets) {
      for (const set of event.group.category.categorySets) {
        if (set.name && !tags.includes(set.name)) {
          tags.push(set.name);
        }
      }
    }

    // Add group name as tag for context
    if (event.group?.name) {
      tags.push(event.group.name);
    }

    // Add city/state as location tags
    if (venue?.city) {
      tags.push(venue.city);
    }
    if (venue?.state) {
      tags.push(venue.state);
    }

    // Build location name
    let locationName: string | undefined;
    if (isVirtual) {
      locationName = "Online Event";
    } else if (venue) {
      const parts = [venue.name];
      if (venue.address) parts.push(venue.address);
      if (venue.city) parts.push(venue.city);
      locationName = parts.filter(Boolean).join(", ");
    }

    return {
      source: this.source,
      externalId: event.id,
      title: event.title,
      description: event.description || null,
      url: event.eventUrl,
      imageUrl: event.imageUrl || null,
      startTime: this.normalizeDateTime(event.startDate),
      endTime: event.endDate ? this.normalizeDateTime(event.endDate) : null,
      location: {
        name: locationName,
        lat: venue?.lat || undefined,
        lng: venue?.lng || undefined,
        isVirtual,
      },
      category,
      tags: [...new Set(tags)], // Remove duplicates
      rawData: event,
    };
  }
}
