/**
 * Server-side database client
 *
 * Creates Supabase client with auth context for server-side operations
 * This is necessary for RLS policies to work correctly in API routes
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get a Supabase client with auth context for server-side operations
 * Use this in API routes and server actions where RLS policies need to check auth.uid()
 */
export async function getServerDbClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  const cookieOptions = {
    get: (name: string) => {
      return cookieStore.get(name)?.value;
    },
    set: (name: string, value: string, options: any) => {
      try {
        cookieStore.set({
          name,
          value,
          ...options,
        });
      } catch {
        // set cookies may fail in server components
        // This is expected and safe to ignore
      }
    },
    remove: (name: string, options: any) => {
      try {
        cookieStore.set({
          name,
          value: "",
          ...options,
          maxAge: 0,
        });
      } catch {
        // remove cookies may fail in server components
        // This is expected and safe to ignore
      }
    },
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  const client = createServerClient(url, key, {
    cookies: cookieOptions,
  }) as SupabaseClient;

  // CRITICAL: Call getSession to load auth context from cookies
  // This is required for RLS policies to work - it triggers the client
  // to read the session from cookies and set up the internal auth state
  // Without this, auth.uid() will always return null in RLS policies
  const { data: { session } } = await client.auth.getSession();

  // Log session info for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[getServerDbClient] Session loaded:', !!session, 'User:', session?.user?.id || 'none');
  }

  return client;
}
