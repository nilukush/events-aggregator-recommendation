/**
 * Plugin System for EventNexus
 *
 * This module defines the plugin architecture for fetching events
 * from various platforms (Eventbrite, Meetup, Luma, etc.)
 *
 * NOTE: Due to API subscription costs, web scraper implementations
 * are used instead of API-based plugins.
 */

// Re-export core types
export * from "./types";

// Plugin base class
export * from "./BaseEventSourcePlugin";

// Web scraper base class
export * from "./WebScraperPlugin";

// Plugin registry
export * from "./PluginRegistry";

// Event source plugins (scrapers)
export * from "./eventbrite";
export * from "./meetup";
export * from "./fractional-dubai";
export * from "./luma";
