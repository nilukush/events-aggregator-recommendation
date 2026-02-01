/**
 * Fractional Dubai Scraper Plugin
 *
 * Scrapes events from Fractional Dubai's website
 * Website: https://www.fractional-dubai.com/events
 */

import { WebScraperPlugin } from "../WebScraperPlugin";
import type { EventFilters, PluginConfig } from "../types";
import type { ParsedEvent } from "../WebScraperPlugin";

const FRACTIONAL_DUBAI_BASE_URL = "https://www.fractional-dubai.com";

/**
 * Fractional Dubai Scraper Plugin
 */
export class FractionalDubaiPlugin extends WebScraperPlugin {
  constructor(config: PluginConfig = {
    enabled: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 2000,
  }) {
    super(
      "Fractional Dubai",
      "1.0.0",
      "fractional-dubai",
      {
        url: `${FRACTIONAL_DUBAI_BASE_URL}/events`,
        baseUrl: FRACTIONAL_DUBAI_BASE_URL,
      },
      config
    );
  }

  /**
   * Build URL - Fractional Dubai has a single events page
   */
  protected buildUrl(_filters: EventFilters): string {
    return this.scraperConfig.url;
  }

  /**
   * Parse events from Fractional Dubai HTML
   */
  protected parseEvents($: any, _filters: EventFilters): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    // Based on the webReader output, the structure is:
    // Events are in sections with category headers like "Fractional Leaders"
    // Each event has a title, date/time, and venue

    // Find all event cards - they have images and titles
    // More flexible filter: accept fractional-dubai images with jpg/png/gif extensions
    const eventImages = $("img").filter((i: number, elem: any) => {
      const src = $(elem).attr("src") || "";
      // Match fractional-dubai domain with common image extensions
      const hasFractionalDomain = src.includes("fractional-dubai");
      const hasImageExtension = /\.(jpg|jpeg|png|gif|webp)/i.test(src);
      const hasKeyword = src.includes("event") || src.includes("networking") ||
                         src.includes("executive") || src.includes("dinner") ||
                         src.includes("breakfast");
      return hasFractionalDomain && (hasImageExtension || hasKeyword);
    });

    const seenTitles = new Set<string>();

    eventImages.each((_: number, imgElem: any) => {
      const $img = $(imgElem);

      // Find the parent container with event info
      const $container = $img.closest("section, div, article");

      // Look for the heading with event title
      const $heading = $container.find("h1, h2, h3, h4, h5, h6").filter((i: number, elem: any) => {
        const text = $(elem).text();
        return text && text.length > 5 && text.length < 100;
      }).first();

      const title = this.extractText($heading);

      if (!title || seenTitles.has(title)) return;
      seenTitles.add(title);

      // Extract URL from the heading or nearby link
      const $link = $heading.find("a").first();
      let url = this.extractAttr($link, "href");
      if (url && !url.startsWith("http")) {
        url = `${FRACTIONAL_DUBAI_BASE_URL}${url}`;
      }
      if (!url) {
        url = `${FRACTIONAL_DUBAI_BASE_URL}/events`;
      }

      // Extract image URL
      const imageUrl = this.extractAttr($img, "src");

      // Get all paragraphs in the container after the heading
      const $allParas = $container.find("p");
      let dateTimeText: string | undefined;
      let locationText: string | undefined;
      let description: string | undefined;

      // Parse paragraphs to identify date, location, and description
      $allParas.each((_: any, para: any) => {
        const text = this.extractText($(para));

        if (!text) return;

        // Check if this looks like a date/time (highest priority)
        const dateMatch = text.match(/(\w+)\s+(\d+),\s+(\d{4})/i);
        if (dateMatch && !dateTimeText) {
          dateTimeText = text;
          return;
        }

        // Check if this looks like a location (starts with "at", contains "Hotel", etc.)
        // More specific location patterns to avoid false positives
        const locationPatterns = [
          /^at\s+/i,  // Starts with "at"
          /\s+Hotel$/i,  // Ends with "Hotel"
          /\s+Tower$/i,  // Ends with "Tower"
          /\s+Marina$/i,  // Ends with "Marina"
          /^Garden\s+/i,  // Starts with "Garden"
        ];
        const isLocation = locationPatterns.some(p => p.test(text));

        if (isLocation && !locationText) {
          locationText = text;
          return;
        }

        // If it's not date or location and looks descriptive, it's a description
        // Description should be substantial text not matching other patterns
        if (!description && !dateTimeText && !locationText &&
            text.length > 20 && text.length < 500) {
          // Exclude common location-only phrases
          if (!text.match(/^(at|Located|Address)/i)) {
            description = text;
          }
        }
      });

      // Extract category from the section heading
      const category = this.extractFractionalCategory($container);

      events.push({
        title,
        url,
        imageUrl: imageUrl || undefined,
        startTime: dateTimeText || undefined,
        location: locationText || undefined,
        description,
        category,
        tags: category ? [category, "fractional", "dubai", "networking", "business"] : ["fractional", "dubai"],
      });
    });

    // Alternative method: Look for specific event patterns
    if (events.length === 0) {
      const altEvents = this.parseEventsAlternative($);
      events.push(...altEvents);
    }

    return events;
  }

  /**
   * Alternative parsing method
   */
  protected parseEventsAlternative($: any): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    // Look for headings that contain event names
    const headings = $("h3").filter((i: number, elem: any) => {
      const text = $(elem).text();
      return text && text.length > 10 && text.length < 100 &&
             !text.includes("Events") && !text.includes("Sign Up");
    });

    headings.each((_: number, headingElem: any) => {
      const $heading = $(headingElem);
      const title = this.extractText($heading);

      if (!title) return;

      // Look for content after the heading - get all siblings after this heading
      // until the next heading
      const $content = $heading.nextUntil("h1, h2, h3, h4, h5, h6");

      const contentText = $content.text();

      // Extract date/time
      const dateMatch = contentText.match(
        /(\w+)\s+(\d+),\s+(\d{4}),?\s*(\d+):(\d+)\s*(AM|PM)/i
      );

      let startTime: string | undefined;
      if (dateMatch) {
        startTime = dateMatch[0];
      }

      // Extract venue - try multiple patterns
      let locationText: string | undefined;
      const venuePatterns = [
        /at\s+([A-Z][^,\n]+)/i,  // "at Ritz Carlton Dubai"
        /([A-Z][^,\n]*Hotel[^,\n]*)/i,  // "Media One Hotel"
      ];

      for (const pattern of venuePatterns) {
        const match = contentText.match(pattern);
        if (match && match[1]) {
          locationText = match[1].trim();
          break;
        }
      }

      // Extract image from the section
      const $img = $heading.parent().find("img").first();
      const imageUrl = this.extractAttr($img, "src");

      events.push({
        title,
        url: `${FRACTIONAL_DUBAI_BASE_URL}/events`,
        imageUrl: imageUrl || undefined,
        startTime,
        location: locationText || undefined,
        category: "Fractional Leaders",
        tags: ["fractional", "dubai", "networking", "business"],
      });
    });

    return events;
  }

  /**
   * Extract location from container
   * Looks for location patterns in text content near the heading
   */
  protected extractLocation($container: any): string | undefined {
    // Look for text patterns like "Garden on 8, Media One Hotel" or "at Ritz Carlton Dubai"
    const allText = $container.text();

    // Try to find location patterns
    const locationPatterns = [
      /at\s+([A-Z][^,\n\.]+)/i,  // "at Ritz Carlton Dubai"
      /([A-Z][^,\n]*Hotel[^,\n]*)/i,  // "Media One Hotel"
      /([A-Z][^,\n]*Tower[^,\n]*)/i,  // "Some Tower"
      /([A-Z][^,\n]*Marina[^,\n]*)/i,  // "Dubai Marina"
    ];

    for (const pattern of locationPatterns) {
      const match = allText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Look in next siblings for location info
    const $allParagraphs = $container.find("p").add($container.nextAll("p"));
    for (let i = 0; i < $allParagraphs.length; i++) {
      const text = this.extractText($allParagraphs.eq(i));
      if (text && (text.includes("Hotel") || text.includes("Tower") ||
                   text.includes("Dubai") || text.includes("Marina") ||
                   text.startsWith("at "))) {
        return text;
      }
    }

    return undefined;
  }

  /**
   * Extract category from section
   */
  protected extractFractionalCategory($container: any): string | undefined {
    // Look for the nearest section heading
    const $section = $container.closest("section");
    const $sectionHeading = $section.find("h1, h2, h3").first();
    const sectionText = this.extractText($sectionHeading);

    // Known category headers
    const categories = ["Fractional Leaders", "SME", "Fractional Social"];
    for (const cat of categories) {
      if (sectionText.includes(cat)) {
        return cat;
      }
    }

    return "Fractional Leaders";
  }

  /**
   * Extract description from container
   */
  protected extractDescription($container: any): string | undefined {
    const $p = $container.find("p").first();
    const text = this.extractText($p);

    if (text && text.length > 20 && text.length < 500) {
      return text;
    }

    return undefined;
  }

  /**
   * Fractional Dubai doesn't support rate limit headers
   */
  protected updateRateLimitFromResponse(_response: Response): void {
    // Keep default rate limiting
  }
}
