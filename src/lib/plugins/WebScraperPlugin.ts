/**
 * Web Scraper Plugin Base Class
 *
 * Provides a base implementation for scraping event data from websites
 * that don't have public APIs. Uses Cheerio for HTML parsing.
 */

import { load } from "cheerio";
import { BaseEventSourcePlugin } from "./BaseEventSourcePlugin";
import type {
  EventFilters,
  NormalizedEvent,
  PluginConfig,
  RateLimitStatus,
} from "./types";
import type { EventSourceType } from "../../types/index";

// Re-export EventSourceType from plugins types for convenience
export type { EventSourceType };

// Cheerio types - using any for flexibility with different cheerio versions
type CheerioAPI = any;
type Element = any;
export interface ScraperConfig {
  url: string;
  baseUrl?: string;
  userAgent?: string;
  timeout?: number;
}

/**
 * Parsed event data from HTML
 */
export interface ParsedEvent {
  title: string;
  url: string;
  imageUrl?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

/**
 * Base class for web scraper plugins
 */
export abstract class WebScraperPlugin extends BaseEventSourcePlugin {
  protected scraperConfig: ScraperConfig;
  protected rateLimit: RateLimitStatus;

  constructor(
    name: string,
    version: string,
    source: EventSourceType,
    scraperConfig: ScraperConfig,
    pluginConfig: PluginConfig = {
      enabled: true,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 2000,
    }
  ) {
    super(name, version, source, pluginConfig);
    this.scraperConfig = scraperConfig;
    this.rateLimit = this.initializeRateLimit();
  }

  /**
   * Initialize rate limits for scraping
   * Scrapers should be conservative to avoid being blocked
   * Can be customized via pluginConfig.rateLimit
   */
  protected initializeRateLimit(): RateLimitStatus {
    // Check if custom rate limit is provided in config
    if (this.config.rateLimit) {
      return {
        limit: this.config.rateLimit.limit,
        remaining: this.config.rateLimit.limit,
        resetAt: null,
        windowMs: this.config.rateLimit.windowMs,
      };
    }

    // Default: 60 requests per hour for web scraping
    return {
      limit: 60,
      remaining: 60,
      resetAt: null,
      windowMs: 60 * 60 * 1000, // 1 hour
    };
  }

  /**
   * Scrapers don't require API keys
   */
  protected requiresApiKey(): boolean {
    return false;
  }

  /**
   * Health check - verify the website is accessible
   */
  protected async performHealthCheck(): Promise<void> {
    const response = await this.fetchPage(this.scraperConfig.url);
    if (!response.ok) {
      throw new Error(`Failed to access ${this.scraperConfig.url}: ${response.statusText}`);
    }
  }

  /**
   * Fetch events by scraping the website
   */
  public async performFetch(filters: EventFilters = {}): Promise<NormalizedEvent[]> {
    // Wait for rate limit if needed
    await this.waitForRateLimit();

    const url = this.buildUrl(filters);
    const response = await this.fetchPage(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Parse events from HTML
    const parsedEvents = this.parseEvents($, filters);

    // Normalize events with filter coordinates for location fallback
    return this.normalizeEvents(parsedEvents, filters);
  }

  /**
   * Fetch a page from the website
   */
  protected async fetchPage(url: string): Promise<Response> {
    this.decrementRateLimit();

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.scraperConfig.timeout || this.config.timeout || 30000
    );

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.scraperConfig.userAgent ||
            "Mozilla/5.0 (compatible; EventNexusBot/1.0; +https://eventnexus.com/bot)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Build the URL to scrape based on filters
   */
  protected abstract buildUrl(filters: EventFilters): string;

  /**
   * Parse events from the HTML
   */
  protected abstract parseEvents($: CheerioAPI, filters: EventFilters): ParsedEvent[];

  /**
   * Normalize parsed events to standard format
   */
  protected normalizeEvents(parsedEvents: ParsedEvent[], filters: EventFilters = {}): NormalizedEvent[] {
    return parsedEvents.map((event) => this.normalizeEvent(event, filters));
  }

  /**
   * Normalize a single event
   */
  protected normalizeEvent(event: ParsedEvent, filters?: EventFilters): NormalizedEvent {
    // Parse date/time to Date objects
    const startTime = event.startTime ? this.parseDateTimeToDate(event.startTime) : new Date();
    const endTime = event.endTime ? this.parseDateTimeToDate(event.endTime) : null;

    // Extract location details
    const location = this.parseLocationWithFilters(event.location, filters);

    // Generate tags from category and event data
    const tags = this.generateTags(event);

    return {
      source: this.source as EventSourceType,
      externalId: this.generateExternalId(event.url),
      title: event.title.trim(),
      description: event.description?.trim() || null,
      url: event.url,
      imageUrl: event.imageUrl || null,
      startTime,
      endTime,
      location,
      category: event.category || null,
      tags: [...new Set(tags)],
      rawData: event,
    };
  }

  /**
   * Generate external ID from URL
   */
  protected generateExternalId(url: string): string {
    // Extract event ID from URL or use hash
    const match = url.match(/\/e\/([^\/]+)/) || url.match(/\/tickets-(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Fallback to hash of URL
    return Buffer.from(url).toString("base64").substring(0, 16);
  }

  /**
   * Parse date/time string to Date object
   */
  protected parseDateTimeToDate(dateStr: string): Date {
    const isoStr = this.parseDateTime(dateStr);
    if (isoStr) {
      const date = new Date(isoStr);
      // Check if date is valid
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    // Fallback to current time if parsing fails
    return new Date();
  }

  /**
   * Parse date/time string to ISO 8601
   */
  protected parseDateTime(dateStr: string): string {
    if (!dateStr) return "";

    // Common formats
    const formats = [
      // "Mon, Feb 3 • 3:00 PM"
      /(\w+),\s+(\w+)\s+(\d+)\s+•\s+(\d+):(\d+)\s+(AM|PM)/i,
      // "Feb 5, 2025 • 7:00 PM"
      /(\w+)\s+(\d+),\s+(\d{4})\s+•\s+(\d+):(\d+)\s+(AM|PM)/i,
      // "December 11, 2025, 6:00 PM - 8:00 PM"
      /(\w+)\s+(\d+),\s+(\d{4}),\s+(\d+):(\d+)\s+(AM|PM)\s*-\s*(\d+):(\d+)\s+(AM|PM)/i,
    ];

    const now = new Date();

    // Try to match formats
    const match1 = dateStr.match(/(\w+),\s+(\w+)\s+(\d+)\s+•\s+(\d+):(\d+)\s+(AM|PM)/i);
    if (match1) {
      const [, dayOfWeek, month, day, hour, minute, ampm] = match1;
      return this.constructDateTime(now.getFullYear(), this.parseMonth(month), parseInt(day), parseInt(hour), parseInt(minute), ampm);
    }

    const match2 = dateStr.match(/(\w+)\s+(\d+),\s+(\d{4})\s+•\s+(\d+):(\d+)\s+(AM|PM)/i);
    if (match2) {
      const [, month, day, year, hour, minute, ampm] = match2;
      return this.constructDateTime(parseInt(year), this.parseMonth(month), parseInt(day), parseInt(hour), parseInt(minute), ampm);
    }

    const match3 = dateStr.match(/(\w+)\s+(\d+),\s+(\d{4}),\s+(\d+):(\d+)\s+(AM|PM)\s*-\s*(\d+):(\d+)\s+(AM|PM)/i);
    if (match3) {
      const [, month, day, year, startHour, startMin, startAmpm, , endHour, endMin, endAmpm] = match3;
      return this.constructDateTime(parseInt(year), this.parseMonth(month), parseInt(day), parseInt(startHour), parseInt(startMin), startAmpm);
    }

    // Default: return as-is (may need manual parsing)
    return dateStr;
  }

  /**
   * Construct ISO datetime from components
   */
  protected constructDateTime(year: number, month: number, day: number, hour: number, minute: number, ampm: string): string {
    let adjustedHour = hour;
    if (ampm.toUpperCase() === "PM" && hour !== 12) {
      adjustedHour += 12;
    } else if (ampm.toUpperCase() === "AM" && hour === 12) {
      adjustedHour = 0;
    }

    const date = new Date(year, month, day, adjustedHour, minute);
    return date.toISOString();
  }

  /**
   * Parse month name to number (0-indexed)
   */
  protected parseMonth(month: string): number {
    const months: Record<string, number> = {
      january: 0, jan: 0,
      february: 1, feb: 1,
      march: 2, mar: 2,
      april: 3, apr: 3,
      may: 4,
      june: 5, jun: 5,
      july: 6, jul: 6,
      august: 7, aug: 7,
      september: 8, sep: 8, sept: 8,
      october: 9, oct: 9,
      november: 10, nov: 10,
      december: 11, dec: 11,
    };
    return months[month.toLowerCase()] ?? 0;
  }

  /**
   * Parse location string
   */
  protected parseLocation(locationStr?: string): NormalizedEvent["location"] {
    if (!locationStr) {
      return { name: undefined, isVirtual: false };
    }

    // Check for virtual/online indicators
    const virtualKeywords = ["online", "virtual", "zoom", "teams", "webinar"];
    const isVirtual = virtualKeywords.some((kw) => locationStr.toLowerCase().includes(kw));

    return {
      name: locationStr,
      lat: undefined,
      lng: undefined,
      isVirtual,
    };
  }

  /**
   * Parse location with fallback to filter coordinates
   * When scraping doesn't provide coordinates, use the search location
   */
  protected parseLocationWithFilters(
    locationStr?: string,
    filters?: EventFilters
  ): NormalizedEvent["location"] {
    const baseLocation = this.parseLocation(locationStr);

    // If we have filter coordinates and the parsed location doesn't have coordinates,
    // use the filter coordinates as the event location
    if (filters && filters.location?.lat && filters.location?.lng && !baseLocation.lat) {
      return {
        ...baseLocation,
        lat: filters.location.lat,
        lng: filters.location.lng,
      };
    }

    return baseLocation;
  }

  /**
   * Generate tags from event data
   */
  protected generateTags(event: ParsedEvent): string[] {
    const tags: string[] = [];

    if (event.category) {
      tags.push(event.category);
    }

    if (event.tags && Array.isArray(event.tags)) {
      tags.push(...event.tags);
    }

    // Extract tags from title
    const title = event.title.toLowerCase();
    const keywordTags = [
      ["networking", "b2b", "business"],
      ["tech", "technology", "ai", "startup"],
      ["music", "concert", "dj"],
      ["workshop", "seminar", "course"],
      ["yoga", "fitness", "wellness"],
      ["dubai", "uae"],
    ];

    for (const keywordGroup of keywordTags) {
      if (keywordGroup.some((kw) => title.includes(kw))) {
        tags.push(keywordGroup[0]);
        break;
      }
    }

    return tags;
  }

  /**
   * Extract text from element, safely handling null
   */
  protected extractText($elem: Element | CheerioAPI | null): string {
    if (!$elem) return "";
    const text = "text" in $elem ? $elem.text() : ($elem as CheerioAPI).text();
    return text?.trim() || "";
  }

  /**
   * Extract attribute from element
   */
  protected extractAttr($elem: Element | CheerioAPI | null, attr: string): string {
    if (!$elem) return "";
    const attrib = "attr" in $elem ? $elem.attr(attr) : ($elem as CheerioAPI).attr(attr);
    return attrib?.trim() || "";
  }
}
