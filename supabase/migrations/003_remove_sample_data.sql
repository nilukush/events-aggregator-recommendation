-- ============================================
-- Remove Sample Data
-- ============================================
-- This migration removes the sample data that was added for testing
-- Run this in production to show only real ingested events

-- Delete all sample events (identified by external_id pattern)
DELETE FROM events
WHERE external_id LIKE 'sample-event-%';

-- Verify deletion
-- SELECT COUNT(*) FROM events WHERE external_id LIKE 'sample-event-%';
-- Should return 0
