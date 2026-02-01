/**
 * Luma Scraper Plugin Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { LumaScraperPlugin } from "../../lib/plugins/luma/LumaScraperPlugin";

// Mock fetch globally
const mockFetch = jest.fn();

global.fetch = mockFetch as any;

describe("LumaScraperPlugin", () => {
  let plugin: LumaScraperPlugin;

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new LumaScraperPlugin();
  });

  it("should have correct metadata", () => {
    expect(plugin.name).toBe("Luma (Web)");
    expect(plugin.source).toBe("luma");
  });

  it("should not require API key", () => {
    expect(plugin["requiresApiKey"]()).toBe(false);
  });

  it("should build default Dubai events URL", () => {
    const url = plugin["buildUrl"]({});
    expect(url).toContain("lu.ma");
    expect(url).toContain("dubai");
  });

  it("should build URL with custom city", () => {
    const url = plugin["buildUrl"]({
      location: { city: "London" }
    });
    expect(url).toContain("lu.ma");
    expect(url).toContain("london");
  });

  it("should convert city names to slugs correctly", () => {
    const plugin2 = new LumaScraperPlugin();
    expect(plugin2["cityToSlug"]("New York")).toBe("nyc");
    expect(plugin2["cityToSlug"]("San Francisco")).toBe("san-francisco");
    expect(plugin2["cityToSlug"]("Abu Dhabi")).toBe("abu-dhabi");
    expect(plugin2["cityToSlug"]("dubai")).toBe("dubai");
  });

  it("should fetch and parse events from Luma HTML", async () => {
    // Mock HTML based on actual Luma structure
    const mockHTML = `
      <html>
        <body>
          <div>
            <a href="/e/formula1-dubai-2025">
              <img src="https://images.lumacdn.com/event-covers/9i/af3c7996.png" alt="F1" />
              <h3>Formula 1 Watch Party Dubai</h3>
              <span class="host">By Katrina & Polina</span>
              <span class="location">Junipers At Vida Emirates Hills</span>
            </a>
          </div>
          <div>
            <a href="/e/ai-education-series">
              <img src="https://images.lumacdn.com/gallery-images/u1/3f6e9e99.png" />
              <h3>AI Education Series</h3>
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
    expect(events[0].title).toBe("Formula 1 Watch Party Dubai");
    expect(events[0].url).toContain("lu.ma");
    expect(events[0].location.name).toContain("Junipers");
  });

  it("should extract category from event title", async () => {
    const mockHTML = `
      <html>
        <body>
          <div>
            <a href="/e/tech-meetup-dubai">
              <img src="https://images.lumacdn.com/event-covers/tech.png" />
              <h3>Tech Networking Dubai</h3>
              <span class="location">Dubai Marina</span>
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

    expect(events[0].category).toBe("Tech");
  });

  it("should handle empty event list gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "<html><body><h1>Popular events in Dubai</h1></body></html>",
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events).toHaveLength(0);
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(plugin["performFetch"]({})).rejects.toThrow("Network error");
  });

  it("should handle HTTP errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Service Unavailable",
    } as Response);

    await expect(plugin["performFetch"]({})).rejects.toThrow("Service Unavailable");
  });

  it("should generate external ID from Luma URL", () => {
    const id = plugin["generateExternalId"]("https://lu.ma/e/abc123-def456");
    expect(id).toBe("abc123-def456");

    const id2 = plugin["generateExternalId"]("https://lu.ma/e/event-123");
    expect(id2).toBe("event-123");
  });

  it("should parse location correctly", () => {
    const location1 = plugin["parseLocation"]("Junipers At Vida Emirates Hills");
    expect(location1.name).toBe("Junipers At Vida Emirates Hills");
    expect(location1.isVirtual).toBe(false);

    const location2 = plugin["parseLocation"]("Online Webinar via Zoom");
    expect(location2.name).toBe("Online Webinar via Zoom");
    expect(location2.isVirtual).toBe(true);
  });

  it("should detect virtual events", () => {
    const location1 = plugin["parseLocation"]("Online event");
    expect(location1.isVirtual).toBe(true);

    const location2 = plugin["parseLocation"]("Virtual meetup");
    expect(location2.isVirtual).toBe(true);

    const location3 = plugin["parseLocation"]("Dubai Marina Mall");
    expect(location3.isVirtual).toBe(false);
  });

  it("should implement rate limiting", () => {
    const rateLimit = plugin["rateLimit"];
    expect(rateLimit.limit).toBe(60); // 60 requests per hour for scraping
    expect(rateLimit.remaining).toBe(60);
  });

  it("should use custom rate limit from config", () => {
    const customPlugin = new LumaScraperPlugin({
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

  it("should handle alternative parsing structure", async () => {
    const mockHTML = `
      <html>
        <body>
          <img src="https://images.lumacdn.com/event-covers/abc/cover.png" />
          <div>
            <h3>Business Networking Event</h3>
            <a href="/e/business-networking-2025"></a>
          </div>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHTML,
    } as Response);

    const events = await plugin["performFetch"]({});

    // Should find event via alternative method
    expect(events.length).toBeGreaterThan(0);
    const event = events.find((e: any) => e.title.includes("Business"));
    expect(event).toBeDefined();
  });

  it("should handle events without images", async () => {
    const mockHTML = `
      <html>
        <body>
          <div>
            <a href="/e/text-only-event">
              <h3>Text Only Event</h3>
              <span class="location">Dubai</span>
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

  it("should add query parameter for search", () => {
    const url = plugin["buildUrl"]({
      query: "tech",
      location: { city: "dubai" }
    });
    expect(url).toContain("q=tech");
  });
});
