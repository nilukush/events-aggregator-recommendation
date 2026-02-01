-- ============================================
-- Production Fixes Migration
-- Run this in production Supabase SQL Editor
-- ============================================

-- Fix 1: Update get_nearby_events to include past events
-- This fixes city filtering that was showing "no events found"
-- because the function was filtering out past events
CREATE OR REPLACE FUNCTION get_nearby_events(
  lat DECIMAL,
  lng DECIMAL,
  radius_km INTEGER DEFAULT 50,
  limit_count INTEGER DEFAULT 50
)
RETURNS SETOF events AS $$
BEGIN
  RETURN QUERY
  SELECT e.*
  FROM events e
  WHERE e.location_lat IS NOT NULL
    AND e.location_lng IS NOT NULL
    AND ST_DWithin(
      CAST(ST_SetSRID(ST_MakePoint(e.location_lng, e.location_lat), 4326) AS geography),
      CAST(ST_SetSRID(ST_MakePoint(lng, lat), 4326) AS geography),
      radius_km * 1000  -- Convert km to meters for ST_DWithin
    )
  ORDER BY
    e.start_time DESC,  -- Show most recent events first
    ST_Distance(
      CAST(ST_SetSRID(ST_MakePoint(e.location_lng, e.location_lat), 4326) AS geography),
      CAST(ST_SetSRID(ST_MakePoint(lng, lat), 4326) AS geography)
    ) ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql
STABLE;

-- Fix 2: Grant anon permissions for public event feed
-- This allows unauthenticated users to browse events
GRANT SELECT ON events TO anon;
GRANT SELECT ON event_sources TO anon;
GRANT EXECUTE ON FUNCTION get_nearby_events TO anon;

-- Fix 3: Grant anon permissions on sequences (for any insert operations that might need it)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
