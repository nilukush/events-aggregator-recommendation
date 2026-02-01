/**
 * Meetup Web Scraper Plugin
 *
 * Scrapes events from Meetup group and location pages
 * Since Meetup GraphQL API requires Pro subscription, we scrape their public website
 */

import { WebScraperPlugin } from "../WebScraperPlugin";
import type { EventFilters, PluginConfig } from "../types";
import type { ParsedEvent } from "../WebScraperPlugin";

const MEETUP_BASE_URL = "https://www.meetup.com";

/**
 * Meetup Scraper Plugin
 */
export class MeetupScraperPlugin extends WebScraperPlugin {
  constructor(config: PluginConfig = {
    enabled: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 2000,
  }) {
    super(
      "Meetup (Web)",
      "1.0.0",
      "meetup",
      {
        url: `${MEETUP_BASE_URL}/find/events/?location=Dubai&radius=50`,
        baseUrl: MEETUP_BASE_URL,
      },
      config
    );
  }

  /**
   * Build URL based on filters with location support
   */
  protected buildUrl(filters: EventFilters): string {
    let url = this.scraperConfig.url;

    // Override with location filter if provided
    if (filters.location?.lat && filters.location?.lng) {
      // For location-based search, use lat/lng
      url = `${MEETUP_BASE_URL}/find/events/?location=${filters.location.lat},${filters.location.lng}&radius=${filters.location.radiusKm || 50}`;
    } else if (filters.city) {
      // For city name (from top-level EventFilters)
      url = `${MEETUP_BASE_URL}/find/events/?location=${encodeURIComponent(filters.city)}`;
    }

    return url;
  }

  /**
   * Parse events from Meetup HTML
   */
  protected parseEvents($: any, _filters: EventFilters): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    // Meetup uses event-listing or eventCard classes
    // Look for event cards with links
    const eventCards = $("a[href*='/events/']").filter((i: number, elem: any) => {
      const href = $(elem).attr("href") || "";
      // Match event URLs like /group-name/events/123456789/ or /events/123456789/
      return /\/events\/\d+/.test(href);
    });

    const seenUrls = new Set<string>();

    eventCards.each((_: number, linkElem: any) => {
      const $link = $(linkElem);
      const url = this.extractAttr($link, "href");

      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);

      // Find the parent event card container
      const $card = $link.closest(".event-listing, .eventCard, article, div[class*='event'], div");

      // Extract title - look within the link first, then the card
      let title = "";
      const $titleInLink = $link.find("h1, h2, h3, h4, h5, h6").first();
      if ($titleInLink.length) {
        title = this.extractText($titleInLink);
      }
      if (!title) {
        const $titleInCard = $card.find("h1, h2, h3, h4, h5, h6").filter((i: number, elem: any) => {
          const text = $(elem).text();
          return text && text.length > 5 && text.length < 200;
        }).first();
        title = this.extractText($titleInCard);
      }
      if (!title) {
        title = this.extractText($link);
      }

      if (!title || title.length > 200) return;

      // Extract image - look within card
      const imgElem = $card.find("img").first();
      const imageUrl = this.extractAttr(imgElem, "src");

      // Extract date/time - look within card
      const timeElem = $card.find("time, [datetime], span[class*='time'], div[class*='time']").first();
      const dateTimeText = this.extractText(timeElem);

      // Extract location - look for venue elements
      const venueElem = $card.find(".eventCard--venue, span[class*='venue'], div[class*='venue']").first();
      const locationText = this.extractText(venueElem);

      // Extract description if available
      const descElem = $card.find(".eventCard--description, p.description, p").filter((i: number, elem: any) => {
        const text = $(elem).text();
        return text && text.length > 20 && text.length < 500;
      }).first();
      const description = this.extractText(descElem);

      // Determine if virtual
      const isVirtual = locationText && (
        locationText.toLowerCase().includes("online") ||
        locationText.toLowerCase().includes("virtual")
      );

      events.push({
        title: title.trim(),
        url: url.startsWith("http") ? url : `${MEETUP_BASE_URL}${url}`,
        imageUrl: imageUrl || undefined,
        startTime: dateTimeText || undefined,
        location: locationText || undefined,
        description: description || undefined,
        category: this.extractMeetupCategory($card),
        tags: this.generateTags({ title, category: this.extractMeetupCategory($card) || "" }),
      });
    });

    // If no events found with primary method, try alternative
    if (events.length === 0) {
      const altEvents = this.parseEventsAlternative($);
      events.push(...altEvents);
    }

    return events;
  }

  /**
   * Alternative parsing method for different Meetup HTML structures
   */
  protected parseEventsAlternative($: any): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    // Look for any links that might be events
    const eventLinks = $("a").filter((i: number, elem: any) => {
      const text = $(elem).text();
      const href = $(elem).attr("href") || "";
      // Look for event-like patterns in URL
      return /\/events\/\d+/.test(href) && text && text.length > 5 && text.length < 100;
    });

    const seenUrls = new Set<string>();

    eventLinks.each((_: number, linkElem: any) => {
      const $link = $(linkElem);
      const url = this.extractAttr($link, "href");
      const title = this.extractText($link);

      if (!url || !title || seenUrls.has(url)) return;
      seenUrls.add(url);

      // Find parent container for more details
      const $card = $link.closest("div, article, section");

      // Try to extract image from nearby
      const imgElem = $card.find("img").first();
      const imageUrl = this.extractAttr(imgElem, "src");

      // Try to find date/time
      const timeElem = $card.find("time, [datetime]").first();
      const dateTimeText = this.extractText(timeElem);

      // Try to find location
      const locationText = this.extractText($card);

      events.push({
        title,
        url: url.startsWith("http") ? url : `${MEETUP_BASE_URL}${url}`,
        imageUrl: imageUrl || undefined,
        startTime: dateTimeText || undefined,
        location: locationText || undefined,
        category: "Meetup",
        tags: ["meetup", "networking"],
      });
    });

    return events;
  }

  /**
   * Extract category from event card
   */
  protected extractMeetupCategory($card: any): string | undefined {
    // Meetup doesn't always show category prominently
    // Try to find category in tags, badges, or URL
    const badgeText = this.extractText($card.find("span[class*='badge'], span[class*='tag']"));

    if (badgeText && badgeText.length < 30) {
      return badgeText;
    }

    // Check URL for category hints
    const url = this.extractAttr($card.find("a"), "href") || "";
    if (url.includes("/tech-") || url.includes("-tech-")) {
      return "Tech";
    }
    if (url.includes("/business-")) {
      return "Business";
    }
    if (url.includes("/social-")) {
      return "Social";
    }

    return undefined;
  }

  /**
   * Generate external ID from URL
   * Meetup uses /group-name/events/123456/ format
   */
  protected generateExternalId(url: string): string {
    // Extract event ID from /events/123456/ pattern
    const match = url.match(/\/events\/(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Fallback to base class method
    return super.generateExternalId(url);
  }

  /**
   * Meetup scraping doesn't support rate limit headers
   */
  protected updateRateLimitFromResponse(_response: Response): void {
    // Keep default rate limiting
  }

  /**
   * Generate tags from event data
   */
  protected generateTags(event: { title: string; category?: string }): string[] {
    const tags: string[] = [];

    if (event.category) {
      tags.push(event.category.toLowerCase());
    }

    // Extract tags from title
    const title = event.title.toLowerCase();
    const keywordTags = [
      ["networking", "business", "startup"],
      ["tech", "technology", "ai", "software", "coding"],
      ["workshop", "seminar", "education"],
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
}
