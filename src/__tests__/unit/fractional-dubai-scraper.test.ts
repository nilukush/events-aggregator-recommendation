/**
 * Fractional Dubai Scraper Plugin Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { FractionalDubaiPlugin } from "../../lib/plugins/fractional-dubai/FractionalDubaiPlugin";

// Mock fetch globally
const mockFetch = jest.fn();

global.fetch = mockFetch as any;

describe("FractionalDubaiPlugin", () => {
  let plugin: FractionalDubaiPlugin;

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new FractionalDubaiPlugin();
  });

  it("should have correct metadata", () => {
    expect(plugin.name).toBe("Fractional Dubai");
    expect(plugin.source).toBe("fractional-dubai");
  });

  it("should not require API key", () => {
    expect(plugin["requiresApiKey"]()).toBe(false);
  });

  it("should build correct events URL", () => {
    const url = plugin["buildUrl"]({});
    expect(url).toBe("https://www.fractional-dubai.com/events");
  });

  it("should fetch and parse events from HTML", async () => {
    // Mock HTML based on actual Fractional Dubai structure
    const mockHTML = `
      <html>
        <body>
          <section>
            <h3>Fractional Social | Dubai</h3>
            <p>December 11, 2025, 6:00 PM - 8:00 PM</p>
            <p>Garden on 8, Media One Hotel</p>
            <img src="https://www.fractional-dubai.com/networking-dubai.png" />
          </section>
          <section>
            <h3>Fractional CXO Deep Dive</h3>
            <p>December 18, 2025, 8:30 AM - 10:30 AM</p>
            <p>Ciao Bella! at Media One Hotel</p>
            <img src="https://www.fractional-dubai.com/event-image.png" />
          </section>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHTML,
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events).toHaveLength(2);
    expect(events[0].title).toBe("Fractional Social | Dubai");
    // Normalized events have location objects, not strings
    expect(events[0].location.name).toContain("Media One Hotel");
    expect(events[1].title).toBe("Fractional CXO Deep Dive");
  });

  it("should parse Fractional Dubai date format correctly", () => {
    const result = plugin["parseDateTime"]("December 11, 2025, 6:00 PM - 8:00 PM");
    expect(result).toBeDefined();
    expect(result).toContain("2025");
  });

  it("should add default tags to events", async () => {
    const mockHTML = `
      <html>
        <body>
          <section>
            <h3>Tech Networking Event</h3>
            <p>February 15, 2026, 3:00 PM</p>
            <img src="https://www.fractional-dubai.com/event.jpg" />
          </section>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHTML,
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events[0].tags).toContain("fractional");
    expect(events[0].tags).toContain("dubai");
  });

  it("should extract category from section", async () => {
    const mockHTML = `
      <html>
        <body>
          <section>
            <h1>Fractional Leaders</h1>
            <h3>Executive Dinner</h3>
            <p>March 5, 2026, 7:00 PM</p>
            <img src="https://www.fractional-dubai.com/dinner.jpg" />
          </section>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHTML,
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events[0].category).toBe("Fractional Leaders");
  });

  it("should handle alternative parsing structure", async () => {
    const mockHTML = `
      <html>
        <body>
          <h3>Networking Breakfast</h3>
          <p>January 20, 2026, 8:00 AM</p>
          <p>at Ritz Carlton Dubai</p>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHTML,
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events.length).toBeGreaterThan(0);
    const event = events.find((e: any) => e.title.includes("Networking"));
    expect(event).toBeDefined();
    // Normalized events have location objects with a name property
    expect(event.location.name).toContain("Ritz Carlton");
  });

  it("should handle empty event list gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "<html><body><h1>Events</h1></body></html>",
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events).toHaveLength(0);
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Connection failed"));

    await expect(plugin["performFetch"]({})).rejects.toThrow("Connection failed");
  });

  it("should handle HTTP errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Service Unavailable",
    } as Response);

    await expect(plugin["performFetch"]({})).rejects.toThrow("Service Unavailable");
  });

  it("should implement rate limiting", () => {
    const rateLimit = plugin["rateLimit"];
    expect(rateLimit.limit).toBe(60); // 60 requests per hour for scraping
  });

  it("should generate external ID for events", () => {
    const url = "https://www.fractional-dubai.com/events";
    const id = plugin["generateExternalId"](url);
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
  });

  it("should parse location correctly", () => {
    const location1 = plugin["parseLocation"]("Dubai Marina Hotel");
    expect(location1.name).toBe("Dubai Marina Hotel");
    expect(location1.isVirtual).toBe(false);

    const location2 = plugin["parseLocation"]("Online Webinar");
    expect(location2.name).toBe("Online Webinar");
    expect(location2.isVirtual).toBe(true);
  });

  it("should extract description from container", async () => {
    const mockHTML = `
      <html>
        <body>
          <section>
            <h3>Executive Event</h3>
            <p>An exclusive gathering for Dubai's top executives</p>
            <p>February 20, 2026, 6:00 PM</p>
            <img src="https://www.fractional-dubai.com/executive.jpg" />
          </section>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHTML,
    } as Response);

    const events = await plugin["performFetch"]({});

    expect(events[0].description).toContain("exclusive gathering");
  });

  it("should handle events without images", async () => {
    const mockHTML = `
      <html>
        <body>
          <section>
            <h3>Text Only Event</h3>
            <p>March 1, 2026, 5:00 PM</p>
          </section>
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
