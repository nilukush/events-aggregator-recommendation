/**
 * Debug API Route - Show event statistics
 * GET /api/debug/events - Returns statistics about events in database
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { TABLES } from "@/lib/db/schema";

export async function GET() {
  try {
    const now = new Date().toISOString();

    // Get total events count
    const { count: totalCount } = await supabase
      .from(TABLES.EVENTS)
      .select("*", { count: "exact", head: true });

    // Get future events count
    const { count: futureCount } = await supabase
      .from(TABLES.EVENTS)
      .select("*", { count: "exact", head: true })
      .gte("start_time", now);

    // Get past events count
    const { count: pastCount } = await supabase
      .from(TABLES.EVENTS)
      .select("*", { count: "exact", head: true })
      .lt("start_time", now);

    // Get sample events (first 5)
    const { data: sampleEvents } = await supabase
      .from(TABLES.EVENTS)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    // Get events by source
    const { data: eventsData } = await supabase
      .from(TABLES.EVENTS)
      .select("source_id");

    // Count by source
    const sourceCounts: Record<string, number> = {};
    if (eventsData) {
      for (const event of eventsData) {
        sourceCounts[event.source_id] = (sourceCounts[event.source_id] || 0) + 1;
      }
    }

    // Get source names
    const { data: sources } = await supabase
      .from(TABLES.EVENT_SOURCES)
      .select("id, name, slug");

    const sourceSummary = (sources || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      event_count: sourceCounts[s.id] || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          total_events: totalCount || 0,
          future_events: futureCount || 0,
          past_events: pastCount || 0,
          current_time: now,
        },
        sample_events: sampleEvents || [],
        events_by_source: sourceSummary || [],
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
