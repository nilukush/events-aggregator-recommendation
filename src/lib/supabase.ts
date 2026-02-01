import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create a mock client for tests when env vars are not set
const isTest = process.env.NODE_ENV === "test";

// For tests, use a placeholder URL if not provided
const url = isTest && !supabaseUrl ? "https://test.supabase.co" : supabaseUrl;
const key = isTest && !supabaseAnonKey ? "test-anon-key" : supabaseAnonKey;

export const supabase = createClient(url, key);

/**
 * Database connection test
 * Returns true if connection is successful
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from("event_sources").select("id").limit(1);
    // We expect an error if table doesn't exist yet, but connection to Supabase works
    // If error is about auth or connection, we have issues
    return !error || !error.message.includes("Failed to fetch");
  } catch {
    return false;
  }
}
