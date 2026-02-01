-- ============================================
-- Sample Data for Testing
-- ============================================

-- Note: This migration is for development/testing only
-- Do not run in production

-- Insert sample events for Eventbrite (Dubai area)
WITH sample_series AS (
  SELECT generate_series(1, 10) AS event_num
),
event_source AS (
  SELECT id FROM event_sources WHERE slug = 'eventbrite' LIMIT 1
)
INSERT INTO events (source_id, external_id, title, description, event_url, image_url, start_time, end_time, location_name, location_lat, location_lng, is_virtual, category, tags)
SELECT
  es.id,
  'sample-eventbrite-' || ss.event_num::text,
  'Sample Tech Meetup Dubai #' || ss.event_num::text,
  'A tech meetup for developers interested in AI, web development, and cloud technologies.',
  'https://eventbrite.com/e/sample-' || ss.event_num::text,
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

-- Insert sample events for Luma (Dubai area)
WITH luma_series AS (
  SELECT generate_series(1, 8) AS event_num
),
luma_source AS (
  SELECT id FROM event_sources WHERE slug = 'luma' LIMIT 1
)
INSERT INTO events (source_id, external_id, title, description, event_url, image_url, start_time, end_time, location_name, location_lat, location_lng, is_virtual, category, tags)
SELECT
  ls.id,
  'luma-event-' || ss.event_num::text,
  CASE (ss.event_num % 4)
    WHEN 0 THEN 'AI Founders Dinner Dubai'
    WHEN 1 THEN 'Blockchain Networking Night'
    WHEN 2 THEN 'Startup Pitch Competition'
    ELSE 'Tech Career Fair'
  END,
  'Join us for an exciting evening of networking and learning. Food and drinks provided.',
  'https://lu.ma/event/dubai-' || ss.event_num::text,
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
  NOW() + (ss.event_num + 2 || ' days')::interval,
  NOW() + (ss.event_num + 2 || ' days')::interval + INTERVAL '4 hours',
  CASE (ss.event_num % 3)
    WHEN 0 THEN 'Downtown Dubai, UAE'
    WHEN 1 THEN 'Dubai Internet City, UAE'
    ELSE 'DIFC, Dubai, UAE'
  END,
  25.2048 + (ss.event_num * 0.01),
  55.2708 + (ss.event_num * 0.01),
  false,
  CASE (ss.event_num % 3)
    WHEN 0 THEN 'Networking'
    WHEN 1 THEN 'Technology'
    ELSE 'Business'
  END,
  CASE (ss.event_num % 3)
    WHEN 0 THEN ARRAY['networking', 'dubai', 'luma']
    WHEN 1 THEN ARRAY['tech', 'ai', 'startup']
    ELSE ARRAY['business', 'pitch', 'funding']
  END
FROM luma_series ss
CROSS JOIN luma_source ls
ON CONFLICT (source_id, external_id) DO NOTHING;

-- Insert sample events for Fractional Dubai (Dubai Marina area)
WITH fractional_series AS (
  SELECT generate_series(1, 6) AS event_num
),
fractional_source AS (
  SELECT id FROM event_sources WHERE slug = 'fractional-dubai' LIMIT 1
)
INSERT INTO events (source_id, external_id, title, description, event_url, image_url, start_time, end_time, location_name, location_lat, location_lng, is_virtual, category, tags)
SELECT
  fs.id,
  'fractional-event-' || ss.event_num::text,
  CASE (ss.event_num % 3)
    WHEN 0 THEN 'Fractional Leaders Dinner'
    WHEN 1 THEN 'Executive Networking Dubai'
    ELSE 'Fractional Careers Workshop'
  END,
  'Connect with fractional executives and leaders in Dubai. Perfect for those exploring fractional work.',
  'https://fractional-dubai.com/events/' || ss.event_num::text,
  'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800',
  NOW() + (ss.event_num + 1 || ' days')::interval,
  NOW() + (ss.event_num + 1 || ' days')::interval + INTERVAL '3 hours',
  'Dubai Marina, UAE',
  25.0805,
  55.1402,
  false,
  'Networking',
  ARRAY['fractional', 'dubai', 'networking', 'executive', 'business', 'leadership']
FROM fractional_series ss
CROSS JOIN fractional_source fs
ON CONFLICT (source_id, external_id) DO NOTHING;

-- Insert sample events for Meetup (Dubai area)
WITH meetup_series AS (
  SELECT generate_series(1, 7) AS event_num
),
meetup_source AS (
  SELECT id FROM event_sources WHERE slug = 'meetup' LIMIT 1
)
INSERT INTO events (source_id, external_id, title, description, event_url, image_url, start_time, end_time, location_name, location_lat, location_lng, is_virtual, category, tags)
SELECT
  ms.id,
  'meetup-event-' || ss.event_num::text,
  CASE (ss.event_num % 3)
    WHEN 0 THEN 'Dubai JavaScript Meetup'
    WHEN 1 THEN 'Python Developers Dubai'
    ELSE 'Cloud & DevOps Meetup'
  END,
  'Monthly meetup for developers to share knowledge and network with peers.',
  'https://meetup.com/dubai-tech/events/' || ss.event_num::text,
  'https://images.unsplash.com/photo-1504384308090-c54be3852f92?w=800',
  NOW() + (ss.event_num + 3 || ' days')::interval,
  NOW() + (ss.event_num + 3 || ' days')::interval + INTERVAL '2 hours',
  CASE (ss.event_num % 2)
    WHEN 0 THEN 'Dubai Media City, UAE'
    ELSE 'Dubai Knowledge Park, UAE'
  END,
  25.0985 + (ss.event_num * 0.005),
  55.2134 + (ss.event_num * 0.005),
  false,
  'Technology',
  CASE (ss.event_num % 3)
    WHEN 0 THEN ARRAY['javascript', 'react', 'nodejs', 'tech']
    WHEN 1 THEN ARRAY['python', 'django', 'ai', 'tech']
    ELSE ARRAY['cloud', 'devops', 'aws', 'kubernetes']
  END
FROM meetup_series ss
CROSS JOIN meetup_source ms
ON CONFLICT (source_id, external_id) DO NOTHING;
