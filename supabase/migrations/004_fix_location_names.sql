-- ============================================
-- Migration 004: Fix Incorrect location_name Values
-- ============================================

-- This migration cleans up location_name values that are clearly wrong
-- For example, Berlin events with "Dubai" in location_name

-- Step 1: Create function to detect language of event title
CREATE OR REPLACE FUNCTION detect_language(text TEXT)
RETURNS TEXT AS $$
DECLARE
  dutch_words TEXT[] := ARRAY['kennismaken', 'wonen', 'met', 'het', 'een', 'voor', 'van', 'uit', 'bij', 'op', 'onder', 'over', 'naar'];
  german_words TEXT[] := ARRAY['kennismachen', 'wohnen', 'mit', 'dem', 'einem', 'fuer', 'von', 'aus', 'bei', 'auf', 'unter', 'ueber', 'nach', 'und'];
  english_words TEXT[] := ARRAY['meet', 'networking', 'event', 'conference', 'workshop', 'webinar'];
BEGIN
  text := LOWER(text);

  -- Check for Dutch words
  IF EXISTS (SELECT 1 FROM unnest(dutch_words) AS word WHERE text LIKE '%' || word || '%') THEN
    RETURN 'dutch';
  END IF;

  -- Check for German words
  IF EXISTS (SELECT 1 FROM unnest(german_words) AS word WHERE text LIKE '%' || word || '%') THEN
    RETURN 'german';
  END IF;

  -- Default to unknown
  RETURN 'unknown';
END;
$$ LANGUAGE plpgsql;

-- Step 2: Function to suggest city based on event language and content
CREATE OR REPLACE FUNCTION suggest_city_from_event(
  event_title TEXT,
  event_description TEXT
) RETURNS TEXT AS $$
DECLARE
  combined_text TEXT;
BEGIN
  combined_text := COALESCE(event_title, '') || ' ' || COALESCE(event_description, '');

  -- Dutch events likely in Netherlands cities
  IF detect_language(combined_text) = 'dutch' THEN
    -- Check for common Dutch cities in title/description
    IF combined_text LIKE '%amsterdam%' THEN RETURN 'Amsterdam'; END IF;
    IF combined_text LIKE '%rotterdam%' THEN RETURN 'Rotterdam'; END IF;
    IF combined_text LIKE '% utrecht%' THEN RETURN 'Utrecht'; END IF;
    IF combined_text LIKE '%den haag%' OR combined_text LIKE '%the hague%' THEN RETURN 'The Hague'; END IF;
    IF combined_text LIKE '%eindhoven%' THEN RETURN 'Eindhoven'; END IF;
    RETURN 'Amsterdam'; -- Default for Dutch
  END IF;

  -- German events likely in German cities
  IF detect_language(combined_text) = 'german' THEN
    IF combined_text LIKE '%berlin%' THEN RETURN 'Berlin'; END IF;
    IF combined_text LIKE '%munich%' OR combined_text LIKE '%münchen%' THEN RETURN 'Munich'; END IF;
    IF combined_text LIKE '%hamburg%' THEN RETURN 'Hamburg'; END IF;
    IF combined_text LIKE '%frankfurt%' THEN RETURN 'Frankfurt'; END IF;
    IF combined_text LIKE '%cologne%' OR combined_text LIKE '%köln%' THEN RETURN 'Cologne'; END IF;
    RETURN 'Berlin'; -- Default for German
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Fix location_name for events with clearly wrong location
-- This targets events where location_name contains a city but the event content suggests otherwise
DO $$
DECLARE
  event_record RECORD;
  suggested_city TEXT;
  clean_location_name TEXT;
BEGIN
  FOR event_record IN
    SELECT id, title, description, location_name
    FROM events
    WHERE location_name IS NOT NULL
    AND location_lat IS NULL  -- Already cleaned up coordinates
  LOOP
    suggested_city := suggest_city_from_event(event_record.title, event_record.description);

    -- If we detected a different city than what's in location_name
    IF suggested_city IS NOT NULL THEN
      -- Check if location_name contains an inappropriate city
      -- For example: Dutch event with "Dubai" in location_name
      clean_location_name := event_record.location_name;

      -- Remove city names that don't match the detected language
      IF suggested_city = 'Amsterdam' OR suggested_city = 'Rotterdam' THEN
        -- Remove UAE cities from location_name
        clean_location_name := regexp_replace(clean_location_name, 'Dubai', '', 'gi');
        clean_location_name := regexp_replace(clean_location_name, 'Abu Dhabi', '', 'gi');
        clean_location_name := regexp_replace(clean_location_name, 'Sharjah', '', 'gi');
      ELSIF suggested_city = 'Berlin' OR suggested_city = 'Munich' THEN
        -- Remove UAE cities from location_name
        clean_location_name := regexp_replace(clean_location_name, 'Dubai', '', 'gi');
        clean_location_name := regexp_replace(clean_location_name, 'Abu Dhabi', '', 'gi');
      END IF;

      -- Clean up the result
      clean_location_name := trim(clean_location_name);
      clean_location_name := regexp_replace(clean_location_name, '^[,\s]+', '', 'gi');
      clean_location_name := regexp_replace(clean_location_name, '[,\s]+$', '', 'gi');

      -- Only update if location_name changed
      IF clean_location_name != event_record.location_name THEN
        UPDATE events
        SET location_name = CASE WHEN clean_location_name = '' THEN NULL ELSE clean_location_name END
        WHERE id = event_record.id;

        RAISE NOTICE 'Fixed location_name for event %: "%" -> "%"', event_record.id, event_record.location_name, clean_location_name;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Step 4: Add helpful view to see events that might still have wrong locations
CREATE OR REPLACE VIEW events_with_potential_wrong_locations AS
SELECT
  id,
  title,
  location_name,
  location_lat,
  location_lng,
  detect_language(title || ' ' || COALESCE(description, '')) as detected_language,
  suggest_city_from_event(title, description) as suggested_city,
  CASE
    WHEN suggest_city_from_event(title, description) IS NOT NULL
     AND location_name IS NOT NULL
     AND NOT (location_name ILIKE '%' || suggest_city_from_event(title, description) || '%')
    THEN 'POTENTIAL MISMATCH'
    ELSE 'OK'
  END as status
FROM events
WHERE location_lat IS NULL;  -- Focus on events without coordinates

COMMENT ON VIEW events_with_potential_wrong_locations IS 'Shows events that might have incorrect location_name values based on language detection';
