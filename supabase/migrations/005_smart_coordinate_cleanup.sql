-- Migration 005: Smart Coordinate Cleanup
--
-- This migration cleans up coordinates where the city derived from coordinates
-- doesn't match the city derived from location_name or event title.
--
-- This handles cases where:
-- 1. Events were scraped before the coordinate assignment fix (Jan 2026)
-- 2. Coordinates were assigned based on filter location rather than actual event location
-- 3. Events have coordinates but location_name/title indicate a different city

-- Step 1: Create a function to check if coordinates match expected city
CREATE OR REPLACE FUNCTION coordinates_match_expected_city(
    p_location_name TEXT,
    p_location_lat NUMERIC,
    p_location_lng NUMERIC,
    p_title TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    city_from_coords TEXT;
    city_from_location TEXT;
    city_from_title TEXT;
BEGIN
    -- Get city from coordinates using bounding box logic (matches location.ts)
    SELECT name INTO city_from_coords
    FROM (
        VALUES
        ('Dubai', 24.8, 25.4, 54.8, 55.6),
        ('Abu Dhabi', 24.2, 24.6, 54.3, 54.8),
        ('Sharjah', 25.2, 25.5, 55.3, 55.6),
        ('Riyadh', 24.5, 25.0, 46.5, 47.0),
        ('Doha', 25.2, 25.4, 51.4, 51.6),
        ('Kuwait City', 29.3, 29.4, 47.9, 48.1),
        ('Manama', 26.0, 26.2, 50.5, 50.6),
        ('Muscat', 23.5, 23.7, 58.3, 58.6),
        ('Singapore', 1.2, 1.5, 103.8, 104.0),
        ('Mumbai', 18.9, 19.3, 72.7, 73.0),
        ('Delhi', 28.4, 28.8, 76.8, 77.3),
        ('Bangalore', 12.8, 13.2, 77.4, 77.8),
        ('Tokyo', 35.5, 35.9, 139.5, 140.0),
        ('Hong Kong', 22.2, 22.4, 114.1, 114.3),
        ('Shanghai', 31.0, 31.5, 121.3, 121.8),
        ('Bangkok', 13.6, 13.9, 100.4, 100.8),
        ('Jakarta', -6.3, -6.0, 106.7, 107.0),
        ('Manila', 14.5, 14.7, 120.9, 121.1),
        ('Kuala Lumpur', 3.0, 3.3, 101.5, 101.8),
        ('London', 51.3, 51.7, -0.5, 0.2),
        ('Paris', 48.8, 49.0, 2.2, 2.5),
        ('Berlin', 52.3, 52.6, 13.2, 13.6),
        ('Amsterdam', 52.3, 52.4, 4.8, 5.0),
        ('Barcelona', 41.3, 41.5, 2.1, 2.3),
        ('Madrid', 40.3, 40.5, -3.8, -3.6),
        ('Rome', 41.8, 42.0, 12.4, 12.6),
        ('Vienna', 48.1, 48.3, 16.3, 16.5),
        ('New York', 40.5, 40.9, -74.1, -73.8),
        ('San Francisco', 37.7, 37.8, -122.5, -122.4),
        ('Los Angeles', 33.9, 34.1, -118.5, -118.2),
        ('Toronto', 43.6, 43.8, -79.5, -79.3),
        ('Chicago', 41.8, 42.0, -87.7, -87.6),
        ('Boston', 42.3, 42.4, -71.1, -70.9),
        ('Seattle', 47.5, 47.7, -122.5, -122.2),
        ('Austin', 30.2, 30.4, -97.8, -97.6),
        ('Miami', 25.7, 25.9, -80.3, -80.1),
        ('Washington', 38.8, 39.0, -77.1, -76.9),
        ('Sydney', -33.9, -33.8, 151.2, 151.3),
        ('Melbourne', -37.9, -37.7, 144.9, 145.0),
        ('Brisbane', -27.5, -27.3, 153.0, 153.1),
        ('Perth', -32.0, -31.8, 115.8, 116.0)
    ) AS cities(name, min_lat, max_lat, min_lng, max_lng)
    WHERE p_location_lat BETWEEN min_lat AND max_lat
      AND p_location_lng BETWEEN min_lng AND max_lng
    LIMIT 1;

    -- Get city from location_name (simple extraction using substring)
    city_from_location := NULL;
    IF p_location_name IS NOT NULL THEN
        IF p_location_name ~ 'Dubai' THEN
            city_from_location := 'Dubai';
        ELSIF p_location_name ~ 'Abu Dhabi' THEN
            city_from_location := 'Abu Dhabi';
        ELSIF p_location_name ~ 'Sharjah' THEN
            city_from_location := 'Sharjah';
        ELSIF p_location_name ~ 'Riyadh' THEN
            city_from_location := 'Riyadh';
        ELSIF p_location_name ~ 'Doha' THEN
            city_from_location := 'Doha';
        ELSIF p_location_name ~ 'Kuwait' THEN
            city_from_location := 'Kuwait';
        ELSIF p_location_name ~ 'Manama' THEN
            city_from_location := 'Manama';
        ELSIF p_location_name ~ 'Muscat' THEN
            city_from_location := 'Muscat';
        ELSIF p_location_name ~ 'Singapore' THEN
            city_from_location := 'Singapore';
        ELSIF p_location_name ~ 'Mumbai' THEN
            city_from_location := 'Mumbai';
        ELSIF p_location_name ~ 'Delhi' THEN
            city_from_location := 'Delhi';
        ELSIF p_location_name ~ 'Bangalore' THEN
            city_from_location := 'Bangalore';
        ELSIF p_location_name ~ 'Tokyo' THEN
            city_from_location := 'Tokyo';
        ELSIF p_location_name ~ 'Hong Kong' THEN
            city_from_location := 'Hong Kong';
        ELSIF p_location_name ~ 'Shanghai' THEN
            city_from_location := 'Shanghai';
        ELSIF p_location_name ~ 'Bangkok' THEN
            city_from_location := 'Bangkok';
        ELSIF p_location_name ~ 'Jakarta' THEN
            city_from_location := 'Jakarta';
        ELSIF p_location_name ~ 'Manila' THEN
            city_from_location := 'Manila';
        ELSIF p_location_name ~ 'Kuala Lumpur' THEN
            city_from_location := 'Kuala Lumpur';
        ELSIF p_location_name ~ 'London' THEN
            city_from_location := 'London';
        ELSIF p_location_name ~ 'Paris' THEN
            city_from_location := 'Paris';
        ELSIF p_location_name ~ 'Berlin' THEN
            city_from_location := 'Berlin';
        ELSIF p_location_name ~ 'Amsterdam' THEN
            city_from_location := 'Amsterdam';
        ELSIF p_location_name ~ 'Barcelona' THEN
            city_from_location := 'Barcelona';
        ELSIF p_location_name ~ 'Madrid' THEN
            city_from_location := 'Madrid';
        ELSIF p_location_name ~ 'Rome' THEN
            city_from_location := 'Rome';
        ELSIF p_location_name ~ 'Vienna' THEN
            city_from_location := 'Vienna';
        ELSIF p_location_name ~ 'New York' THEN
            city_from_location := 'New York';
        ELSIF p_location_name ~ 'San Francisco' THEN
            city_from_location := 'San Francisco';
        ELSIF p_location_name ~ 'Los Angeles' THEN
            city_from_location := 'Los Angeles';
        ELSIF p_location_name ~ 'Toronto' THEN
            city_from_location := 'Toronto';
        ELSIF p_location_name ~ 'Chicago' THEN
            city_from_location := 'Chicago';
        ELSIF p_location_name ~ 'Boston' THEN
            city_from_location := 'Boston';
        ELSIF p_location_name ~ 'Seattle' THEN
            city_from_location := 'Seattle';
        ELSIF p_location_name ~ 'Austin' THEN
            city_from_location := 'Austin';
        ELSIF p_location_name ~ 'Miami' THEN
            city_from_location := 'Miami';
        ELSIF p_location_name ~ 'Washington' THEN
            city_from_location := 'Washington';
        ELSIF p_location_name ~ 'Sydney' THEN
            city_from_location := 'Sydney';
        ELSIF p_location_name ~ 'Melbourne' THEN
            city_from_location := 'Melbourne';
        ELSIF p_location_name ~ 'Brisbane' THEN
            city_from_location := 'Brisbane';
        ELSIF p_location_name ~ 'Perth' THEN
            city_from_location := 'Perth';
        ELSE
            city_from_location := SPLIT_PART(p_location_name, ',', 1);
        END IF;
    END IF;

    -- Get city from title (using substring matching)
    city_from_title := NULL;
    IF p_title IS NOT NULL THEN
        IF p_title ~ 'Nepal' THEN
            city_from_title := 'Nepal';
        ELSIF p_title ~ 'Dubai' THEN
            city_from_title := 'Dubai';
        ELSIF p_title ~ 'Abu Dhabi' THEN
            city_from_title := 'Abu Dhabi';
        ELSIF p_title ~ 'Sharjah' THEN
            city_from_title := 'Sharjah';
        ELSIF p_title ~ 'Riyadh' THEN
            city_from_title := 'Riyadh';
        ELSIF p_title ~ 'Doha' THEN
            city_from_title := 'Doha';
        ELSIF p_title ~ 'Kuwait' THEN
            city_from_title := 'Kuwait';
        ELSIF p_title ~ 'Manama' THEN
            city_from_title := 'Manama';
        ELSIF p_title ~ 'Muscat' THEN
            city_from_title := 'Muscat';
        ELSIF p_title ~ 'Singapore' THEN
            city_from_title := 'Singapore';
        ELSIF p_title ~ 'Mumbai' THEN
            city_from_title := 'Mumbai';
        ELSIF p_title ~ 'Delhi' THEN
            city_from_title := 'Delhi';
        ELSIF p_title ~ 'Bangalore' THEN
            city_from_title := 'Bangalore';
        ELSIF p_title ~ 'Tokyo' THEN
            city_from_title := 'Tokyo';
        ELSIF p_title ~ 'Hong Kong' THEN
            city_from_title := 'Hong Kong';
        ELSIF p_title ~ 'Shanghai' THEN
            city_from_title := 'Shanghai';
        ELSIF p_title ~ 'Bangkok' THEN
            city_from_title := 'Bangkok';
        ELSIF p_title ~ 'Jakarta' THEN
            city_from_title := 'Jakarta';
        ELSIF p_title ~ 'Manila' THEN
            city_from_title := 'Manila';
        ELSIF p_title ~ 'Kuala Lumpur' THEN
            city_from_title := 'Kuala Lumpur';
        ELSIF p_title ~ 'London' THEN
            city_from_title := 'London';
        ELSIF p_title ~ 'Paris' THEN
            city_from_title := 'Paris';
        ELSIF p_title ~ 'Berlin' THEN
            city_from_title := 'Berlin';
        ELSIF p_title ~ 'Amsterdam' THEN
            city_from_title := 'Amsterdam';
        ELSIF p_title ~ 'Barcelona' THEN
            city_from_title := 'Barcelona';
        ELSIF p_title ~ 'Madrid' THEN
            city_from_title := 'Madrid';
        ELSIF p_title ~ 'Rome' THEN
            city_from_title := 'Rome';
        ELSIF p_title ~ 'Vienna' THEN
            city_from_title := 'Vienna';
        ELSIF p_title ~ 'New York' THEN
            city_from_title := 'New York';
        ELSIF p_title ~ 'San Francisco' THEN
            city_from_title := 'San Francisco';
        ELSIF p_title ~ 'Los Angeles' THEN
            city_from_title := 'Los Angeles';
        ELSIF p_title ~ 'Toronto' THEN
            city_from_title := 'Toronto';
        ELSIF p_title ~ 'Chicago' THEN
            city_from_title := 'Chicago';
        ELSIF p_title ~ 'Boston' THEN
            city_from_title := 'Boston';
        ELSIF p_title ~ 'Seattle' THEN
            city_from_title := 'Seattle';
        ELSIF p_title ~ 'Austin' THEN
            city_from_title := 'Austin';
        ELSIF p_title ~ 'Miami' THEN
            city_from_title := 'Miami';
        ELSIF p_title ~ 'Washington' THEN
            city_from_title := 'Washington';
        ELSIF p_title ~ 'Sydney' THEN
            city_from_title := 'Sydney';
        ELSIF p_title ~ 'Melbourne' THEN
            city_from_title := 'Melbourne';
        ELSIF p_title ~ 'Brisbane' THEN
            city_from_title := 'Brisbane';
        ELSIF p_title ~ 'Perth' THEN
            city_from_title := 'Perth';
        END IF;
    END IF;

    -- Check if there's a mismatch
    -- If coords point to one city, but title/location points to a different city, return FALSE
    IF city_from_coords IS NOT NULL THEN
        -- Check against location_name
        IF city_from_location IS NOT NULL AND city_from_coords != city_from_location THEN
            RETURN FALSE;
        END IF;

        -- Check against title (but be more lenient - only if it clearly contains a different city)
        IF city_from_title IS NOT NULL AND city_from_title != city_from_coords THEN
            -- Special case: if title contains Nepal but coords point to Doha, that's a mismatch
            IF city_from_title = 'Nepal' AND city_from_coords = 'Doha' THEN
                RETURN FALSE;
            END IF;

            -- General case: if title contains a well-known city that differs from coords city
            IF city_from_title IN ('Dubai', 'Abu Dhabi', 'Sharjah', 'Riyadh', 'Doha', 'Kuwait', 'Manama', 'Muscat', 'Singapore', 'Mumbai', 'Delhi', 'Bangalore', 'Tokyo', 'Hong Kong', 'London', 'Paris', 'Berlin', 'New York', 'Toronto', 'Sydney') THEN
                RETURN FALSE;
            END IF;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Nullify coordinates for events where there's a clear mismatch
-- This targets the most common issue: coordinates from filter location applied to events in other cities
UPDATE events
SET
    location_lat = NULL,
    location_lng = NULL,
    updated_at = NOW()
WHERE
    location_lat IS NOT NULL
    AND location_lng IS NOT NULL
    AND NOT coordinates_match_expected_city(
        location_name,
        location_lat,
        location_lng,
        title
    );

-- Step 3: Add comment to document this migration
COMMENT ON FUNCTION coordinates_match_expected_city IS 'Checks if event coordinates match the expected city derived from location_name or title';

-- Log the results (for verification)
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM events
    WHERE location_lat IS NULL;

    RAISE NOTICE 'After migration 005: % events now have NULL coordinates', v_count;
END $$;
