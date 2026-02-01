/**
 * Luma Web Scraper Plugin
 *
 * Scrapes events from Luma location-based discovery pages
 * URL pattern: https://lu.ma/{city-slug}
 * Example: https://lu.ma/dubai, https://lu.ma/london, https://lu.ma/new-york
 *
 * Note: Luma is a React SPA, so we use the web reader API which can handle
 * JavaScript-rendered content via a service that extracts the page content.
 */

import { WebScraperPlugin } from "../WebScraperPlugin";
import type { EventFilters, PluginConfig, NormalizedEvent } from "../types";
import type { ParsedEvent } from "../WebScraperPlugin";

const LUMA_BASE_URL = "https://lu.ma";
const WEB_READER_API = "https://webreader-production.up.railway.app/webReader";

/**
 * Luma Scraper Plugin
 */
export class LumaScraperPlugin extends WebScraperPlugin {
  constructor(config: PluginConfig = {
    enabled: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 2000,
  }) {
    super(
      "Luma (Web)",
      "1.0.0",
      "luma",
      {
        url: `${LUMA_BASE_URL}/dubai`,
        baseUrl: LUMA_BASE_URL,
      },
      config
    );
  }

  /**
   * Build URL based on filters with location support
   * Luma uses city slugs for location-based event discovery
   */
  protected buildUrl(filters: EventFilters): string {
    let url = this.scraperConfig.url;

    // Check if city is provided
    if (filters.city) {
      const citySlug = this.cityToSlug(filters.city);
      url = `${LUMA_BASE_URL}/${citySlug}`;
    }

    // Add query parameter if searching
    if (filters.query) {
      url += `?q=${encodeURIComponent(filters.query)}`;
    }

    return url;
  }

  /**
   * Convert city name to URL slug
   */
  private cityToSlug(city: string): string {
    const cityLower = city.toLowerCase();

    // Common city slug mappings
    const slugMap: Record<string, string> = {
      "dubai": "dubai",
      "abu dhabi": "abu-dhabi",
      "london": "london",
      "new york": "nyc",
      "san francisco": "san-francisco",
      "los angeles": "los-angeles",
      "singapore": "singapore",
      "tokyo": "tokyo",
      "paris": "paris",
      "berlin": "berlin",
      "mumbai": "mumbai",
      "delhi": "delhi",
      "bangalore": "bangalore",
      "sydney": "sydney",
      "toronto": "toronto",
      "amsterdam": "amsterdam",
      "barcelona": "barcelona",
    };

    return slugMap[cityLower] || cityLower.replace(/\s+/g, "-");
  }

  /**
   * Override performFetch to use the web reader API for SPA content
   */
  public async performFetch(filters: EventFilters = {}): Promise<NormalizedEvent[]> {
    // Wait for rate limit if needed
    await this.waitForRateLimit();

    const url = this.buildUrl(filters);

    // Use the web reader API to get the page content as markdown
    // This allows us to fetch JavaScript-rendered content
    const response = await fetch(`${WEB_READER_API}?url=${encodeURIComponent(url)}&return_format=markdown`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(this.scraperConfig.timeout || this.config.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url} via web reader: ${response.statusText}`);
    }

    const data = await response.json();

    // The web reader returns an array, get the first item's content
    const content = data?.[0]?.text?.content || data?.content || "";

    if (!content) {
      console.warn(`No content received from web reader for ${url}`);
      return [];
    }

    // Parse the markdown content to extract events
    const parsedEvents = this.parseEventsFromMarkdown(content, url);

    // Normalize events
    return this.normalizeEvents(parsedEvents);
  }

  /**
   * Parse events from markdown content returned by web reader
   */
  protected parseEventsFromMarkdown(markdown: string, baseUrl: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    const lines = markdown.split("\n");

    let currentEvent: Partial<ParsedEvent> | null = null;
    let inEventsSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if we're in the Events section
      if (line === "## Events") {
        inEventsSection = true;
        continue;
      }

      // Only process lines in the Events section
      if (!inEventsSection) continue;

      // Stop if we hit another major section
      if (line.startsWith("## ") && line !== "## Events") {
        break;
      }

      // Extract image URL (markdown format: ![...](url))
      const imageMatch = line.match(/^!\[.*?\]\((https:\/\/[^)]+)\)/);
      if (imageMatch) {
        // Save the previous event if it has a title
        if (currentEvent?.title) {
          events.push(currentEvent as ParsedEvent);
        }
        // Start a new event
        currentEvent = {
          imageUrl: imageMatch[1],
          tags: ["luma", "dubai"],
        };
        continue;
      }

      // Extract title (markdown heading format: ### Title)
      const titleMatch = line.match(/^###\s+(.+)$/);
      if (titleMatch && currentEvent) {
        currentEvent.title = titleMatch[1].trim();
        currentEvent.url = this.generateEventUrl(currentEvent.title);
        continue;
      }

      // Extract host/organizer (starts with "By ")
      if (line.startsWith("By ") && currentEvent) {
        const host = line.substring(3).trim();
        // Add to description or as a tag
        if (!currentEvent.description) {
          currentEvent.description = `Hosted by ${host}`;
        }
        currentEvent.tags = [...(currentEvent.tags || []), "hosted"];
        continue;
      }

      // Extract location (looks like a venue name without special formatting)
      // Location is typically on its own line, not starting with # or !
      if (line &&
          !line.startsWith("#") &&
          !line.startsWith("!") &&
          !line.startsWith("By") &&
          line.length > 5 &&
          line.length < 100 &&
          !line.includes("http") &&
          currentEvent &&
          !currentEvent.location) {
        // This is likely a location
        currentEvent.location = line;
        continue;
      }

      // Extract category from title
      if (currentEvent?.title) {
        currentEvent.category = this.extractLumaCategory(currentEvent.title, null);
      }
    }

    // Don't forget the last event
    if (currentEvent?.title) {
      events.push(currentEvent as ParsedEvent);
    }

    return events;
  }

  /**
   * Generate a URL for the event based on title
   * Luma event URLs are /e/{slug}
   */
  protected generateEventUrl(title: string): string {
    // Create a simple slug from the title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50);
    return `${LUMA_BASE_URL}/e/${slug}`;
  }

  /**
   * Parse events from Luma HTML (legacy, kept for fallback)
   */
  protected parseEvents($: any, _filters: EventFilters): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    // Luma displays events in a list format
    // Each event typically has:
    // - A link to /e/{event-id}
    // - A cover image from images.lumacdn.com
    // - A title (heading)
    // - Host information
    // - Location/venue

    const eventLinks = $("a[href*='/e/']").filter((i: number, elem: any) => {
      const href = $(elem).attr("href") || "";
      // Match event URLs like /e/abc123
      return /^\/e\/[a-zA-Z0-9-]+$/.test(href);
    });

    const seenUrls = new Set<string>();

    eventLinks.each((_: number, linkElem: any) => {
      const $link = $(linkElem);
      const url = this.extractAttr($link, "href");

      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);

      // Find the parent container
      const $card = $link.closest("div, article, section");

      // Extract title - look for headings within or near the card
      const $title = $card.find("h1, h2, h3, h4, h5, h6").filter((i: number, elem: any) => {
        const text = $(elem).text();
        return text && text.length > 5 && text.length < 200;
      }).first();

      let title = this.extractText($title);

      // If no title found in heading, use link text
      if (!title) {
        title = this.extractText($link);
      }

      if (!title || title.length > 200) return;

      // Extract image
      const imgElem = $card.find("img").first();
      const imageUrl = this.extractAttr(imgElem, "src");

      // Extract host information (usually "By {name}")
      const hostText = this.extractText($card.find("span[class*='host'], div[class*='host'], p[class*='host']").first());

      // Extract location/venue
      const locationElem = $card.find("span[class*='location'], div[class*='location'], span[class*='venue']").first();
      let locationText = this.extractText(locationElem);

      // Also try to find location in text content
      if (!locationText) {
        const cardText = $card.text();
        // Look for common Dubai venue patterns
        const venuePatterns = [
          /at\s+([A-Z][^,\n]+?(?:Hotel|Tower|Marina|Center|Mall))/,
          /([A-Z][^,\n]*?(?:Hotel|Tower|Marina|Center|Mall))/,
        ];
        for (const pattern of venuePatterns) {
          const match = cardText.match(pattern);
          if (match && match[1]) {
            locationText = match[1].trim();
            break;
          }
        }
      }

      // Extract date/time
      const timeElem = $card.find("time, span[class*='time'], div[class*='time'], span[class*='date']").first();
      const dateTimeText = this.extractText(timeElem);

      // Try to extract description from card content
      const descElem = $card.find("p, div[class*='description']").filter((i: number, elem: any) => {
        const text = $(elem).text();
        return text && text.length > 20 && text.length < 500;
      }).first();
      const description = this.extractText(descElem);

      // Determine if virtual
      const isVirtual = locationText && (
        locationText.toLowerCase().includes("online") ||
        locationText.toLowerCase().includes("virtual") ||
        locationText.toLowerCase().includes("zoom")
      );

      events.push({
        title: title.trim(),
        url: url.startsWith("http") ? url : `${LUMA_BASE_URL}${url}`,
        imageUrl: imageUrl || undefined,
        startTime: dateTimeText || undefined,
        location: locationText || undefined,
        description: description || undefined,
        category: this.extractLumaCategory(title, $card),
        tags: [],
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
   * Alternative parsing method for different Luma HTML structures
   */
  protected parseEventsAlternative($: any): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    // Look for images from Luma CDN as event indicators
    const eventImages = $("img[src*='lumacdn.com']").filter((i: number, elem: any) => {
      const src = $(elem).attr("src") || "";
      // Look for event cover images
      return src.includes("/event-covers/") || src.includes("/gallery-images/");
    });

    const seenUrls = new Set<string>();

    eventImages.each((_: number, imgElem: any) => {
      const $img = $(imgElem);
      const imageUrl = this.extractAttr($img, "src");

      // Find the parent container
      const $card = $img.closest("div, article, section, a");

      // Look for event link
      const $link = $card.find("a[href*='/e/']").first();
      const url = this.extractAttr($link, "href");

      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);

      // Find title
      const $title = $card.find("h1, h2, h3, h4, h5, h6").first();
      const title = this.extractText($title);

      if (!title) return;

      events.push({
        title,
        url: url.startsWith("http") ? url : `${LUMA_BASE_URL}${url}`,
        imageUrl: imageUrl || undefined,
        category: "Event",
        tags: ["luma", "dubai"],
      });
    });

    return events;
  }

  /**
   * Extract category from title and card content
   */
  private extractLumaCategory(title: string, $card: any): string | undefined {
    const titleLower = title.toLowerCase();

    // Category keywords
    const categoryMap: Record<string, string[]> = {
      "Tech": ["tech", "ai", "coding", "programming", "software", "developer", "workshop", "hackathon"],
      "Business": ["business", "networking", "startup", "entrepreneur", "pitch", "investment"],
      "Finance": ["crypto", "blockchain", "trading", "investment", "finance", "defi"],
      "Social": ["party", "social", "gathering", "meetup", "community"],
      "Sports": ["sports", "fitness", "yoga", "run", "marathon", "watch party"],
      "Arts": ["art", "exhibition", "gallery", "music", "concert", "show"],
      "Education": ["education", "course", "class", "learning", "seminar", "lecture"],
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some((kw) => titleLower.includes(kw))) {
        return category;
      }
    }

    // Check for badges or tags in the card
    const badgeText = this.extractText($card.find("span[class*='badge'], span[class*='tag'], span[class*='category']"));
    if (badgeText && badgeText.length < 30) {
      return badgeText;
    }

    return undefined;
  }

  /**
   * Luma scraping doesn't support rate limit headers
   */
  protected updateRateLimitFromResponse(_response: Response): void {
    // Keep default rate limiting
  }

  /**
   * Generate external ID from Luma URL
   */
  protected generateExternalId(url: string): string {
    // Extract event ID from /e/{event-id} pattern
    const match = url.match(/\/e\/([a-zA-Z0-9-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Fallback to hash of URL
    return Buffer.from(url).toString("base64").substring(0, 16);
  }
}
