-- ============================================
-- Migration 003: Cleanup Incorrect Event Coordinates
-- ============================================

-- This migration fixes events that have incorrect coordinates assigned
-- from previous ingestion runs where filter coordinates were assigned
-- to ALL events regardless of their actual location.

-- Example problem: "Sobha Sanctuary Dubai" event has Berlin coordinates (52.52, 13.405)

-- Step 1: Create a function to check if coordinates match city name in title
CREATE OR REPLACE FUNCTION coordinates_match_city_in_title(
  event_title TEXT,
  event_lat DECIMAL,
  event_lng DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  city_bounds RECORD;
BEGIN
  -- City bounding boxes: name, minLat, maxLat, minLng, maxLng
  -- These are approximate bounding boxes for major cities
  FOR city_bounds IN
    SELECT * FROM (VALUES
      -- UAE Cities
      ('dubai', 24.8, 25.4, 54.8, 55.6),
      ('abu dhabi', 24.2, 24.7, 54.2, 54.7),
      ('sharjah', 25.3, 25.4, 55.4, 55.5),
      -- Saudi Arabia
      ('riyadh', 24.6, 24.9, 46.5, 47.0),
      ('jeddah', 21.4, 21.7, 39.1, 39.3),
      -- Qatar
      ('doha', 25.2, 25.4, 51.4, 51.7),
      -- Bahrain
      ('manama', 26.0, 26.2, 50.5, 50.6),
      -- Oman
      ('muscat', 23.5, 23.7, 58.3, 58.5),
      -- Kuwait
      ('kuwait city', 29.3, 29.4, 47.9, 48.1),
      -- Singapore
      ('singapore', 1.2, 1.5, 103.8, 104.0),
      -- India
      ('mumbai', 18.9, 19.3, 72.8, 73.0),
      ('delhi', 28.4, 28.8, 77.0, 77.3),
      ('bangalore', 12.9, 13.1, 77.5, 77.7),
      -- UK
      ('london', 51.4, 51.6, -0.3, 0.1),
      -- Germany
      ('berlin', 52.3, 52.6, 13.2, 13.6),
      -- Netherlands
      ('amsterdam', 52.3, 52.4, 4.8, 5.0),
      -- France
      ('paris', 48.8, 48.9, 2.3, 2.4),
      -- Spain
      ('barcelona', 41.3, 41.5, 2.1, 2.3),
      -- USA
      ('new york', 40.6, 40.9, -74.1, -73.8),
      ('san francisco', 37.7, 37.8, -122.5, -122.4),
      ('los angeles', 33.9, 34.2, -118.5, -118.2),
      -- Canada
      ('toronto', 43.6, 43.8, -79.5, -79.3),
      -- Australia
      ('sydney', -33.9, -33.7, 151.2, 151.3),
      -- Japan
      ('tokyo', 35.6, 35.8, 139.6, 140.0)
    ) AS city(name, minLat, maxLat, minLng, maxLng)
    WHERE LOWER(event_title) LIKE '%' || city.name || '%'
  LOOP
    -- Check if coordinates are OUTSIDE the expected bounds
    IF event_lat < city_bounds.minLat OR event_lat > city_bounds.maxLat OR
       event_lng < city_bounds.minLng OR event_lng > city_bounds.maxLng THEN
      RETURN FALSE; -- Coordinates don't match city in title
    END IF;
    RETURN TRUE; -- Coordinates match city in title
  END LOOP;

  -- No city match in title, can't determine
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Nullify coordinates for events where they don't match the city in the title
-- This ensures that city badges will fall back to text-based extraction
UPDATE events
SET location_lat = NULL, location_lng = NULL
WHERE location_lat IS NOT NULL
  AND location_lng IS NOT NULL
  AND coordinates_match_city_in_title(title, location_lat, location_lng) = FALSE;

-- Step 3: Add comment for documentation
COMMENT ON FUNCTION coordinates_match_city_in_title IS 'Checks if event coordinates match the city name found in the event title. Returns FALSE if coordinates are outside the expected bounds for the city mentioned in the title.';

-- Step 4: Create a view to see events with coordinates that might still be wrong
-- This can be used for manual verification
CREATE OR REPLACE VIEW events_with_potential_wrong_coordinates AS
SELECT
  id,
  title,
  location_name,
  location_lat,
  location_lng,
  coordinates_match_city_in_title(title, location_lat, location_lng) as coordinates_match_title,
  CASE
    WHEN coordinates_match_city_in_title(title, location_lat, location_lng) = FALSE THEN 'POTENTIAL MISMATCH'
    WHEN coordinates_match_city_in_title(title, location_lat, location_lng) = TRUE THEN 'OK'
    ELSE 'UNKNOWN'
  END as status
FROM events
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- Step 5: Log the cleanup results
DO $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cleaned_count
  FROM events
  WHERE location_lat IS NULL AND location_lng IS NULL;

  RAISE NOTICE 'Cleanup complete. Events with null coordinates: %', cleaned_count;
END $$;
