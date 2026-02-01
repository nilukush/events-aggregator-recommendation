/**
 * Eventbrite Scraper Plugin Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { EventbriteScraperPlugin } from "../../lib/plugins/eventbrite/EventbriteScraperPlugin";

// Mock fetch globally
const mockFetch = jest.fn();

global.fetch = mockFetch as any;

describe("EventbriteScraperPlugin", () => {
  let plugin: EventbriteScraperPlugin;

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new EventbriteScraperPlugin();
  });

  it("should have correct metadata", () => {
    expect(plugin.name).toBe("Eventbrite (Web)");
    expect(plugin.source).toBe("eventbrite");
  });

  it("should not require API key", () => {
    expect(plugin["requiresApiKey"]()).toBe(false);
  });

  it("should build default Dubai events URL", () => {
    const url = plugin["buildUrl"]({});
    expect(url).toContain("eventbrite.com");
    expect(url).toContain("dubai");
  });

  it("should fetch and parse events from HTML", async () => {
    // Mock HTML response similar to Eventbrite's actual structure
    const mockHTML = `
      <html>
        <body>
          <div data-spec="event-card-spec">
            <div data-spec="event-card-spec--title">
              <a href="/e/test-event-123456789/">Test Tech Event</a>
            </div>
            <img src="https://img.evbuc.com/test-image.jpg" data-spec="event-card-spec--image" />
            <div data-spec="event-card-spec--date">Tue, Feb 4 • 6:00 PM</div>
            <div data-spec="event-card-spec--venue">Dubai Tech Hub</div>
          </div>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHTML,
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Test Tech Event");
    expect(events[0].url).toContain("eventbrite.com");
    expect(events[0].imageUrl).toBe("https://img.evbuc.com/test-image.jpg");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("should handle empty event list gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "<html><body></body></html>",
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events).toHaveLength(0);
  });

  it("should parse date/time correctly", () => {
    const result = plugin["parseDateTime"]("Tue, Feb 4 • 6:00 PM");
    expect(result).toBeDefined();
    // Should produce a valid ISO date string
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should parse various date formats", () => {
    // Test "Mon, Feb 3 • 3:00 PM" format
    const result1 = plugin["parseDateTime"]("Mon, Feb 3 • 3:00 PM");
    expect(result1).toBeDefined();

    // Test "Feb 5, 2025 • 7:00 PM" format
    const result2 = plugin["parseDateTime"]("Feb 5, 2025 • 7:00 PM");
    expect(result2).toBeDefined();
    expect(result2).toContain("2025");
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(plugin["performFetch"]({})).rejects.toThrow("Network error");
  });

  it("should handle HTTP errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Not Found",
    } as Response);

    await expect(plugin["performFetch"]({})).rejects.toThrow("Not Found");
  });

  it("should generate external ID from URL", () => {
    const id1 = plugin["generateExternalId"]("https://www.eventbrite.com/e/my-event-123456/");
    expect(id1).toBe("my-event-123456");

    const id2 = plugin["generateExternalId"]("https://www.eventbrite.com/tickets-999999/abc/");
    expect(id2).toBe("999999");
  });

  it("should parse location correctly", () => {
    const location1 = plugin["parseLocation"]("Dubai Marina, Dubai");
    expect(location1.name).toBe("Dubai Marina, Dubai");
    expect(location1.isVirtual).toBe(false);

    const location2 = plugin["parseLocation"]("Online Event");
    expect(location2.name).toBe("Online Event");
    expect(location2.isVirtual).toBe(true);
  });

  it("should generate tags from event data", () => {
    const event = {
      title: "Tech Networking Event for Startups",
      url: "https://example.com/event",
      category: "Business",
    };

    const tags = plugin["generateTags"](event);
    // Tags should be lowercase
    expect(tags.some((t: string) => t.toLowerCase() === "business")).toBe(true);
    expect(tags).toContain("networking");
  });

  it("should extract category from URL", async () => {
    const mockHTML = `
      <html>
        <body>
          <div data-spec="event-card-spec">
            <span class="badge">Music</span>
            <div data-spec="event-card-spec--title">
              <a href="/e/test-event-123/">Concert Event</a>
            </div>
          </div>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHTML,
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events[0].category).toBe("Music");
  });

  it("should use alternative parsing when primary structure fails", async () => {
    const mockHTML = `
      <html>
        <body>
          <article>
            <a href="/e/alt-event-987/">Alternative Event</a>
            <h3>Alternative Event</h3>
            <img src="https://img.evbuc.com/alt-image.jpg" />
            <div class="date">Fri, Mar 7 • 9:30 AM</div>
            <div class="location">The Dubai Venue</div>
          </article>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHTML,
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events.length).toBeGreaterThan(0);
    const altEvent = events.find((e: any) => e.title.includes("Alternative"));
    expect(altEvent).toBeDefined();
  });

  it("should implement rate limiting", () => {
    const rateLimit = plugin["rateLimit"];
    expect(rateLimit.limit).toBe(60); // 60 requests per hour
    expect(rateLimit.remaining).toBe(60);
  });
});
