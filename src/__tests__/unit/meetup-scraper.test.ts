/**
 * Meetup Scraper Plugin Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { MeetupScraperPlugin } from "../../lib/plugins/meetup/MeetupScraperPlugin";

// Mock fetch globally
const mockFetch = jest.fn();

global.fetch = mockFetch as any;

describe("MeetupScraperPlugin", () => {
  let plugin: MeetupScraperPlugin;

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new MeetupScraperPlugin();
  });

  it("should have correct metadata", () => {
    expect(plugin.name).toBe("Meetup (Web)");
    expect(plugin.source).toBe("meetup");
  });

  it("should not require API key", () => {
    expect(plugin["requiresApiKey"]()).toBe(false);
  });

  it("should build default Dubai events URL", () => {
    const url = plugin["buildUrl"]({});
    expect(url).toContain("meetup.com");
    expect(url).toContain("Dubai");
  });

  it("should build URL with custom location", () => {
    const url = plugin["buildUrl"]({
      location: { lat: 25.2048, lng: 55.2708, radiusKm: 100 }
    });
    expect(url).toContain("meetup.com");
  });

  it("should fetch and parse events from group page HTML", async () => {
    // Mock HTML based on actual Meetup group page structure
    const mockHTML = `
      <html>
        <body>
          <div class="event-listing">
            <a href="/tech-dubai/events/123456789/" class="eventCard--link">
              <div class="eventCard--title">
                <h3>Tech & Business Networking Dubai</h3>
              </div>
              <time> Tue, Mar 4, 2025, 6:00 PM GST</time>
              <div class="eventCard--venue">
                <span>Jabbour Lebanese Restaurant</span>
                <span>Dubai, AE</span>
              </div>
              <img src="https://secure.meetupstatic.com/photos/event/3/8/4/a/clean_519914410.webp" alt="Event" />
            </a>
          </div>
          <div class="event-listing">
            <a href="/dubai-tech/events/987654321/" class="eventCard--link">
              <div class="eventCard--title">
                <h3>AI Workshop Dubai</h3>
              </div>
              <time>Wed, Mar 12, 2025, 7:00 PM GST</time>
              <div class="eventCard--venue">
                <span>Dubai Internet City</span>
              </div>
              <img src="https://secure.meetupstatic.com/photos/event/1/2/3/clean_123456.webp" alt="Event" />
            </a>
          </div>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHTML,
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events).toHaveLength(2);
    expect(events[0].title).toBe("Tech & Business Networking Dubai");
    expect(events[0].url).toContain("meetup.com");
    expect(events[0].location.name).toContain("Jabbour");
  });

  it("should handle empty event list gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "<html><body><p>No upcoming events</p></body></html>",
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events).toHaveLength(0);
  });

  it("should parse Meetup date format correctly", () => {
    const result = plugin["parseDateTime"]("Tue, Mar 4, 2025, 6:00 PM GST");
    expect(result).toBeDefined();
    expect(result).toContain("2025");
  });

  it("should parse various Meetup date formats", () => {
    // Test "Mon, Feb 3 • 3:00 PM" format
    const result1 = plugin["parseDateTime"]("Mon, Feb 3, 2025, 3:00 PM GST");
    expect(result1).toBeDefined();

    // Test "Feb 5, 2025 • 7:00 PM" format
    const result2 = plugin["parseDateTime"]("Feb 5, 2025, 7:00 PM GST");
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
    const id1 = plugin["generateExternalId"]("https://www.meetup.com/tech-dubai/events/123456/");
    expect(id1).toBe("123456");

    const id2 = plugin["generateExternalId"]("https://www.meetup.com/dubai-tech/events/999999/");
    expect(id2).toBe("999999");
  });

  it("should parse location correctly", () => {
    const location1 = plugin["parseLocation"]("Jabbour Lebanese Restaurant, Dubai, AE");
    expect(location1.name).toBe("Jabbour Lebanese Restaurant, Dubai, AE");
    expect(location1.isVirtual).toBe(false);

    const location2 = plugin["parseLocation"]("Online Event");
    expect(location2.name).toBe("Online Event");
    expect(location2.isVirtual).toBe(true);
  });

  it("should generate tags from event data", () => {
    const event = {
      title: "Tech Networking Event for Startups",
      url: "https://example.com/event",
      category: "Tech",
    };

    const tags = plugin["generateTags"](event);
    expect(tags).toContain("tech");
    expect(tags).toContain("networking");
  });

  it("should detect virtual events", () => {
    const location1 = plugin["parseLocation"]("Online event");
    expect(location1.isVirtual).toBe(true);

    const location2 = plugin["parseLocation"]("Dubai Marina");
    expect(location2.isVirtual).toBe(false);
  });

  it("should implement rate limiting", () => {
    const rateLimit = plugin["rateLimit"];
    expect(rateLimit.limit).toBe(60); // 60 requests per hour for scraping
    expect(rateLimit.remaining).toBe(60);
  });

  it("should use custom rate limit from config", () => {
    const customPlugin = new MeetupScraperPlugin({
      enabled: true,
      rateLimit: {
        limit: 100,
        windowMs: 120000, // 2 minutes
      },
    });

    const rateLimit = customPlugin["rateLimit"];
    expect(rateLimit.limit).toBe(100);
    expect(rateLimit.windowMs).toBe(120000);
  });

  it("should extract description from event details", async () => {
    const mockHTML = `
      <html>
        <body>
          <div class="event-listing">
            <a href="/tech-dubai/events/123/" class="eventCard--link">
              <div class="eventCard--title">
                <h3>AI Workshop</h3>
              </div>
              <div class="eventCard--description">
                <p>Join us for an intensive AI workshop covering machine learning basics and advanced techniques.</p>
              </div>
              <time>Sat, Mar 15, 2025, 2:00 PM GST</time>
              <div class="eventCard--venue">
                <span>Dubai Internet City</span>
              </div>
            </a>
          </div>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHTML,
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events[0].description).toContain("AI workshop");
  });

  it("should handle events without images", async () => {
    const mockHTML = `
      <html>
        <body>
          <div class="event-listing">
            <a href="/tech-dubai/events/456/" class="eventCard--link">
              <div class="eventCard--title">
                <h3>Text Only Event</h3>
              </div>
              <time>Sat, Mar 20, 2026, 5:00 PM GST</time>
            </a>
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
    expect(events[0].imageUrl).toBeNull();
  });
});
