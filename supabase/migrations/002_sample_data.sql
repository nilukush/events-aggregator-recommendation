-- ============================================
-- Sample Data for Testing
-- ============================================

-- Note: This migration is for development/testing only
-- Do not run in production

-- Insert sample events (Dubai area)
-- Use a CTE to generate the series first, then join with event_sources
WITH sample_series AS (
  SELECT
    generate_series(1, 10) AS event_num
),
event_source AS (
  SELECT id FROM event_sources WHERE slug = 'eventbrite' LIMIT 1
)
INSERT INTO events (source_id, external_id, title, description, event_url, image_url, start_time, end_time, location_name, location_lat, location_lng, is_virtual, category, tags)
SELECT
  es.id,
  'sample-event-' || ss.event_num::text,
  'Sample Tech Meetup Dubai #' || ss.event_num::text,
  'A tech meetup for developers interested in AI, web development, and cloud technologies.',
  'https://example.com/event/' || ss.event_num::text,
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  NOW() + (ss.event_num || ' days')::interval,
  NOW() + (ss.event_num || ' days')::interval + INTERVAL '3 hours',
  'Dubai Marina, Dubai, UAE',
  25.0805,
  55.1402,
  false,
  CASE (ss.event_num % 3)
    WHEN 0 THEN 'Technology'
    WHEN 1 THEN 'Business'
    ELSE 'Networking'
  END,
  CASE (ss.event_num % 4)
    WHEN 0 THEN ARRAY['ai', 'machine-learning', 'tech']
    WHEN 1 THEN ARRAY['networking', 'startup']
    WHEN 2 THEN ARRAY['web3', 'blockchain']
    ELSE ARRAY['cloud', 'devops']
  END
FROM sample_series ss
CROSS JOIN event_source es
ON CONFLICT (source_id, external_id) DO NOTHING;
