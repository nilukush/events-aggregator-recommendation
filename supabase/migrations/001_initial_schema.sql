-- ============================================
-- EventNexus Database Schema
-- ============================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable PostGIS extension for geospatial queries
-- Must be installed in public schema for geography type to be accessible
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;

-- ============================================
-- Event Sources Table
-- Stores metadata about event platforms
-- ============================================
CREATE TABLE IF NOT EXISTS event_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  api_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for event_sources
CREATE INDEX IF NOT EXISTS idx_event_sources_active ON event_sources(is_active) WHERE is_active = true;

-- ============================================
-- Events Table
-- Normalized event data from all sources
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES event_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_url TEXT NOT NULL,
  image_url TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location_name TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  is_virtual BOOLEAN DEFAULT false,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  raw_data JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536),
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, external_id)
);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_events_source_id ON events(source_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time DESC);

-- PostGIS GiST index for geospatial queries using geography type
-- Note: PostGIS uses longitude first (x), then latitude (y)
-- We must set SRID 4326 (WGS84) and cast to geography for accurate geodetic calculations
CREATE INDEX IF NOT EXISTS idx_events_location_gist ON events
USING GIST (CAST(ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326) AS geography))
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_is_virtual ON events(is_virtual);
CREATE INDEX IF NOT EXISTS idx_events_embedding ON events USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- User Preferences Table
-- Stores user interests and location preferences
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interests TEXT[] DEFAULT '{}',
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_radius_km INTEGER DEFAULT 50,
  preferred_days TEXT[] DEFAULT '{}', -- ['monday', 'tuesday', ...]
  preferred_times TEXT[] DEFAULT '{}', -- ['morning', 'afternoon', 'evening']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- User Interactions Table
-- Tracks user engagement with events
-- ============================================
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'rsvp', 'hide', 'bookmark')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user_interactions
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_event_id ON user_interactions(event_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_event ON user_interactions(user_id, event_id);

-- ============================================
-- Recommendations Table
-- Cached recommendations for users
-- ============================================
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  score DECIMAL(5, 4) NOT NULL, -- Relevance score 0-1
  reason TEXT,
  algorithm TEXT, -- 'content-based', 'collaborative', 'hybrid'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(user_id, event_id)
);

-- Create indexes for recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires_at ON recommendations(expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_algorithm ON recommendations(algorithm);

-- ============================================
-- Insert default event sources
-- ============================================
INSERT INTO event_sources (name, slug, api_config) VALUES
  ('Eventbrite', 'eventbrite', '{"base_url": "https://www.eventbrite.com", "rate_limit": {"points_per_hour": 1000}, "has_api": false}'::jsonb),
  ('Meetup', 'meetup', '{"base_url": "https://www.meetup.com", "rate_limit": {"points_per_hour": 60}, "has_api": false}'::jsonb),
  ('Luma', 'luma', '{"base_url": "https://lu.ma", "rate_limit": {"points_per_hour": 60}, "has_api": false}'::jsonb),
  ('Fractional Dubai', 'fractional-dubai', '{"base_url": "https://www.fractional-dubai.com", "has_api": false}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_event_sources_updated_at BEFORE UPDATE ON event_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get nearby events using PostGIS geolocation
-- Uses ST_DWithin for efficient distance-based queries with GiST index
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
    AND e.start_time >= NOW()
    AND ST_DWithin(
      CAST(ST_SetSRID(ST_MakePoint(e.location_lng, e.location_lat), 4326) AS geography),
      CAST(ST_SetSRID(ST_MakePoint(lng, lat), 4326) AS geography),
      radius_km * 1000  -- Convert km to meters for ST_DWithin
    )
  ORDER BY
    ST_Distance(
      CAST(ST_SetSRID(ST_MakePoint(e.location_lng, e.location_lat), 4326) AS geography),
      CAST(ST_SetSRID(ST_MakePoint(lng, lat), 4326) AS geography)
    ) ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql
STABLE;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on tables that reference auth.users
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- User interactions policies
CREATE POLICY "Users can view own interactions" ON user_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON user_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recommendations policies
CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- Grant necessary permissions
-- ============================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select on tables that should be readable by authenticated users
GRANT SELECT ON events TO authenticated;
GRANT SELECT ON event_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;
GRANT SELECT, INSERT ON user_interactions TO authenticated;
GRANT SELECT ON recommendations TO authenticated;

-- Grant execute on the nearby events function
GRANT EXECUTE ON FUNCTION get_nearby_events TO authenticated;
