/**
 * Event Ingestion API Route
 *
 * POST /api/ingest - Trigger event ingestion from all or specific sources
 *
 * This endpoint allows triggering event ingestion from various sources.
 * By default, it ingests from all enabled sources.
 *
 * Query parameters:
 * - sources: Comma-separated list of sources to ingest (e.g., "meetup,luma")
 * - location_lat: Latitude for location-based filtering
 * - location_lng: Longitude for location-based filtering
 * - radius_km: Radius in km for location filtering
 * - city: City name for location-based filtering
 * - limit: Maximum number of events to fetch per source
 *
 * Example usage:
 * - POST /api/ingest - Ingest from all sources
 * - POST /api/ingest?sources=meetup - Ingest only from Meetup
 * - POST /api/ingest?sources=meetup,luma&city=Dubai - Ingest from Meetup and Luma for Dubai
 */

import { NextRequest, NextResponse } from "next/server";
import { eventIngestionService } from "@/lib/services/EventIngestionService";
import { pluginRegistry } from "@/lib/plugins/PluginRegistry";
import type { EventSourceType } from "@/lib/plugins/types";
import type {
  ApiResponse,
  IngestionResponse,
} from "@/lib/api/types";

/**
 * POST /api/ingest
 *
 * Trigger event ingestion from all or specific sources
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const sourcesParam = searchParams.get("sources");
    const locationLat = searchParams.get("location_lat");
    const locationLng = searchParams.get("location_lng");
    const radiusKm = searchParams.get("radius_km");
    const city = searchParams.get("city");
    const limit = searchParams.get("limit");

    // Build sources list
    let sources: EventSourceType[] | undefined = undefined;
    if (sourcesParam) {
      sources = sourcesParam.split(",") as EventSourceType[];
    }

    // Build location filter for scrapers
    const filters: {
      location?: {
        lat?: number;
        lng?: number;
        radiusKm?: number;
        city?: string;
      };
      limit?: number;
    } = {};

    if (locationLat && locationLng) {
      filters.location = {
        lat: parseFloat(locationLat),
        lng: parseFloat(locationLng),
      };
      if (radiusKm) {
        filters.location.radiusKm = parseFloat(radiusKm);
      }
    }

    if (city) {
      filters.location = filters.location || {};
      filters.location.city = city;
    }

    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    // Register plugins if not already registered
    await ensurePluginsRegistered();

    // Trigger ingestion
    const result = await eventIngestionService.ingest({
      sources,
      filters: filters as any, // Cast to satisfy EventFilters type
      continueOnError: true, // Continue even if one source fails
    });

    // Build response
    const data: IngestionResponse = {
      sources: result.sources.map((s) => ({
        source: s.source,
        success: s.success,
        events_fetched: s.eventsFetched,
        events_stored: s.eventsStored,
        errors: s.errors,
        duration_ms: s.durationMs,
      })),
      total_events_fetched: result.totalEventsFetched,
      total_events_stored: result.totalEventsStored,
      total_errors: result.totalErrors,
      duration_ms: result.durationMs,
    };

    const response: ApiResponse<IngestionResponse> = {
      success: true,
      data,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error during event ingestion:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to ingest events",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/ingest
 *
 * Get ingestion statistics and health status
 */
export async function GET() {
  try {
    // Ensure plugins are registered
    await ensurePluginsRegistered();

    // Get health status for all plugins
    const healthStatus = await eventIngestionService.getHealthStatus();

    // Get ingestion stats
    const stats = eventIngestionService.getStats();

    const response: ApiResponse<{
      health: Array<{
        source: string;
        isHealthy: boolean;
        lastCheckAt: Date;
        lastError?: string;
        responseTimeMs?: number;
      }>;
      stats: Array<{
        source: string;
        success_count: number;
        error_count: number;
        last_run_at: Date | null;
        duration_ms: number;
        errors: string[];
      }>;
    }> = {
      success: true,
      data: {
        health: Array.from(healthStatus.entries()).map(([source, status]) => ({
          source,
          isHealthy: status.isHealthy,
          lastCheckAt: status.lastCheckAt,
          lastError: status.lastError?.message,
          responseTimeMs: status.responseTimeMs,
        })),
        stats: stats.map((s) => ({
          source: s.source,
          success_count: s.successCount,
          error_count: s.errorCount,
          last_run_at: s.lastRunAt || null,
          duration_ms: s.durationMs,
          errors: s.errors.map((e: { message?: string }) => e.message || String(e)),
        })),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error getting ingestion status:", error);

    const errorResponse: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get ingestion status",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Ensure plugins are registered in the registry
 */
async function ensurePluginsRegistered(): Promise<void> {
  const { MeetupScraperPlugin } = await import("@/lib/plugins/meetup");
  const { LumaScraperPlugin } = await import("@/lib/plugins/luma");
  const { EventbriteScraperPlugin } = await import("@/lib/plugins/eventbrite");
  const { FractionalDubaiPlugin } = await import("@/lib/plugins/fractional-dubai");

  // Register plugins if not already registered
  const plugins = [
    new MeetupScraperPlugin(),
    new LumaScraperPlugin(),
    new EventbriteScraperPlugin(),
    new FractionalDubaiPlugin(),
  ];

  for (const plugin of plugins) {
    if (!pluginRegistry.has(plugin.source)) {
      pluginRegistry.register(plugin);
    }
  }

  // Sync with database
  await eventIngestionService.syncWithDatabase();
}
