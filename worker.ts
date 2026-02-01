/**
 * EventNexus Background Worker
 *
 * This worker periodically fetches events from all configured sources
 * and stores them in the database.
 *
 * Can be deployed to Render as a Cron Worker or run locally.
 *
 * Environment variables:
 * - INGEST_URL: URL of the ingest endpoint (e.g., https://your-app.vercel.app/api/ingest)
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_ANON_KEY: Supabase anon key
 * - CRON_SCHEDULE: Cron schedule (default: every hour)
 */

const INGEST_URL = process.env.INGEST_URL || "http://localhost:3000/api/ingest";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const CITY = process.env.CITY || "Dubai";
const LAT = process.env.LAT || "25.2048";
const LNG = process.env.LNG || "55.2708";
const RADIUS_KM = process.env.RADIUS_KM || "50";

/**
 * Log message with timestamp
 */
function log(message: string, level: "info" | "error" | "warn" = "info"): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

/**
 * Trigger event ingestion
 */
async function triggerIngestion(): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      city: CITY,
      location_lat: LAT,
      location_lng: LNG,
      radius_km: RADIUS_KM,
    });

    const url = `${INGEST_URL}?${params.toString()}`;
    log(`Triggering ingestion: ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "EventNexus-Worker/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    log(`Ingestion completed: ${JSON.stringify(data, null, 2)}`);

    return true;
  } catch (error) {
    log(`Ingestion failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    return false;
  }
}

/**
 * Check database connection
 */
async function checkDatabase(): Promise<boolean> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      log("Supabase credentials not configured", "warn");
      return false;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/health`, {
      headers: {
       apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const isHealthy = response.ok;
    log(`Database check: ${isHealthy ? "healthy" : "unhealthy"}`);
    return isHealthy;
  } catch (error) {
    log(`Database check failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    return false;
  }
}

/**
 * Main worker function
 */
export async function main(): Promise<void> {
  log("EventNexus Background Worker started");
  log(`Configuration: city=${CITY}, lat=${LAT}, lng=${LNG}, radius=${RADIUS_KM}`);

  // Check database health
  const dbHealthy = await checkDatabase();
  if (!dbHealthy) {
    log("Skipping ingestion due to database issues", "warn");
    return;
  }

  // Trigger ingestion
  const success = await triggerIngestion();
  if (success) {
    log("Worker completed successfully");
  } else {
    log("Worker completed with errors", "error");
    process.exit(1);
  }
}

// Run the worker if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    log(`Fatal error: ${error instanceof Error ? error.message : String(error)}`, "error");
    process.exit(1);
  });
}
