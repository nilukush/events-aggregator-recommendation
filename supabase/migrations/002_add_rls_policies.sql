-- ============================================
-- Migration 002: Add Missing RLS Policies
-- ============================================

-- This migration adds missing Row Level Security (RLS) policies
-- that were preventing recommendations from being inserted
--
-- Note: Uses DO block for PostgreSQL < 15 compatibility
-- (CREATE POLICY IF NOT EXISTS is only available in PG 15+)

-- ============================================
-- INSERT Policy for recommendations
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recommendations'
    AND policyname = 'Users can insert own recommendations'
  ) THEN
    CREATE POLICY "Users can insert own recommendations"
      ON recommendations
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- UPDATE Policy for recommendations
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recommendations'
    AND policyname = 'Users can update own recommendations'
  ) THEN
    CREATE POLICY "Users can update own recommendations"
      ON recommendations
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- DELETE Policy for recommendations
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recommendations'
    AND policyname = 'Users can delete own recommendations'
  ) THEN
    CREATE POLICY "Users can delete own recommendations"
      ON recommendations
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- Grant permissions
-- ============================================
GRANT INSERT ON recommendations TO authenticated;
GRANT UPDATE ON recommendations TO authenticated;
GRANT DELETE ON recommendations TO authenticated;
