/**
 * Eventbrite Web Scraper Plugin
 *
 * Scrapes events from Eventbrite location pages
 * Since Eventbrite's public search API was deprecated, we scrape their public website
 */

import { WebScraperPlugin } from "../WebScraperPlugin";
import type { EventFilters, PluginConfig } from "../types";
import type { ParsedEvent } from "../WebScraperPlugin";

const EVENTBRITE_BASE_URL = "https://www.eventbrite.com";

/**
 * Eventbrite Scraper Plugin
 */
export class EventbriteScraperPlugin extends WebScraperPlugin {
  constructor(config: PluginConfig = {
    enabled: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 2000,
  }) {
    super(
      "Eventbrite (Web)",
      "1.0.0",
      "eventbrite",
      {
        url: `${EVENTBRITE_BASE_URL}/d/united-arab-emirates--dubai/events/`,
        baseUrl: EVENTBRITE_BASE_URL,
      },
      config
    );
  }

  /**
   * Build URL based on filters
   */
  protected buildUrl(filters: EventFilters): string {
    let url = this.scraperConfig.url;

    // Add category filter if specified
    if (filters.categories && filters.categories.length > 0) {
      const category = filters.categories[0].toLowerCase();
      // Eventbrite uses slugs for categories
      const categorySlugs: Record<string, string> = {
        music: "/d/united-arab-emirates--dubai/music--events/",
        business: "/d/united-arab-emirates--dubai/business--events/",
        "science and tech": "/d/united-arab-emirates--dubai/science-and-tech--events/",
        food: "/d/united-arab-emirates--dubai/food--events/",
      };
      if (categorySlugs[category]) {
        url = `${EVENTBRITE_BASE_URL}${categorySlugs[category]}`;
      }
    }

    return url;
  }

  /**
   * Parse events from Eventbrite HTML
   */
  protected parseEvents($: any, filters: EventFilters): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    // Eventbrite uses a specific DOM structure for event cards
    // Events are in divs with specific data-testid or class attributes
    const eventCards = $("div[data-spec='event-card-spec']");

    eventCards.each((_index: number, element: any) => {
      const $card = $(element);

      // Extract title
      const title = this.extractText($card.find("div[data-spec='event-card-spec--title'] a, h3 a, a[aria-label*='event']"));

      if (!title) return; // Skip if no title

      // Extract URL
      const urlElem = $card.find("a[href*='/e/']").first();
      const url = this.extractAttr(urlElem, "href");
      const fullUrl = url ? (url.startsWith("http") ? url : `${EVENTBRITE_BASE_URL}${url}`) : "";

      // Extract image
      const imgElem = $card.find("img[src*='evbuc'], img[data-spec='event-card-spec--image']").first();
      const imageUrl = this.extractAttr(imgElem, "src");

      // Extract date/time
      const dateTimeText = this.extractText($card.find("div[data-spec='event-card-spec--date'], div[data-spec='event-time-spec--start-date']"));

      // Extract location
      const locationText = this.extractText($card.find("div[data-spec='event-card-spec--venue'], div[data-spec='event-location-spec--venue']"));

      // Extract price (not using for now, but available)
      // const priceText = this.extractText($card.find("div[data-spec='event-card-spec--price']"));

      // Extract category from tags or URL
      const category = this.extractEventbriteCategory($card, fullUrl);

      events.push({
        title,
        url: fullUrl,
        imageUrl: imageUrl || undefined,
        startTime: dateTimeText || undefined,
        location: locationText || undefined,
        category,
      });
    });

    // If the new structure doesn't work, try alternative selectors
    if (events.length === 0) {
      const altEvents = this.parseEventsAlternative($);
      events.push(...altEvents);
    }

    return events;
  }

  /**
   * Alternative parsing method for different Eventbrite HTML structures
   */
  protected parseEventsAlternative($: any): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    // Try finding events by looking for common patterns
    // Event links typically have /e/ in the URL
    const eventLinks = $("a[href*='/e/']");

    eventLinks.each((_index: number, element: any) => {
      const $link = $(element);
      const url = this.extractAttr($link, "href");

      // Skip if this URL was already processed
      if (events.some((e) => e.url === url)) return;

      // Find the parent card
      const $card = $link.closest("div[class*='event'], article[class*='event'], section[class*='event']");

      // Extract title from link or nearby heading
      let title = this.extractText($link);
      if (!title || title.length > 100) {
        // Title might be in a heading nearby
        const $title = $card.find("h1, h2, h3, h4").first();
        title = this.extractText($title);
      }

      if (!title) return;

      // Extract image from card
      const imgElem = $card.find("img").first();
      const imageUrl = this.extractAttr(imgElem, "src");

      // Try to find date info
      const dateElem = $card.find("div[class*='date'], span[class*='date'], time").first();
      const dateTimeText = this.extractText(dateElem);

      // Try to find location info
      const locationElem = $card.find("div[class*='location'], div[class*='venue'], span[class*='place']").first();
      const locationText = this.extractText(locationElem);

      events.push({
        title,
        url: url.startsWith("http") ? url : `${EVENTBRITE_BASE_URL}${url}`,
        imageUrl: imageUrl || undefined,
        startTime: dateTimeText || undefined,
        location: locationText || undefined,
      });
    });

    return events;
  }

  /**
   * Extract category from event card
   */
  protected extractEventbriteCategory($card: any, url: string): string | undefined {
    // Try to find category in badges or tags
    const badgeText = this.extractText($card.find("span[class*='badge'], span[class*='tag'], span[class*='category']"));

    if (badgeText && badgeText.length < 30) {
      return badgeText;
    }

    // Extract from URL path
    const pathMatch = url.match(/\/([^/]+)--events\//);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1].replace(/-/g, " ");
    }

    return undefined;
  }

  /**
   * Eventbrite doesn't support rate limit headers from scraping
   */
  protected updateRateLimitFromResponse(_response: Response): void {
    // Keep default rate limiting
  }
}
