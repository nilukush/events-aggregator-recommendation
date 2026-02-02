-- Migration: Fix Email Confirmation for Existing Users
--
-- Problem: Users created before email confirmation was disabled have
-- email_confirmed_at = NULL, which causes sign-in to fail even though
-- email confirmation is now disabled in Supabase settings.
--
-- Solution: Update all users with NULL email_confirmed_at to mark them
-- as confirmed using their account creation date.

-- Mark all existing unconfirmed users as confirmed
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, created_at)
WHERE email_confirmed_at IS NULL;

-- Verify the update
SELECT
  id,
  email,
  created_at,
  email_confirmed_at,
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN 'CONFIRMED'
    ELSE 'NOT CONFIRMED'
  END as status
FROM auth.users
ORDER BY created_at DESC;
