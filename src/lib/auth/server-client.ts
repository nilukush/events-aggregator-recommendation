/**
 * Supabase Auth Server Client
 *
 * Server-side Supabase client with auth helpers
 * For use in API routes, Server Components, and Server Actions
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Create a Supabase client for server-side operations
 * This handles cookie management for authentication
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const cookieOptions: {
    get: (name: string) => string | undefined;
    set: (name: string, value: string, options?: any) => void;
    remove: (name: string, options?: any) => void;
  } = {
    get: (name: string) => {
      return cookieStore.get(name)?.value;
    },
    set: (name: string, value: string, options?: any) => {
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
    remove: (name: string, options?: any) => {
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

  return createServerClient(url, key, {
    cookies: cookieOptions,
  });
}

/**
 * Get the current authenticated user from the server
 * Returns null if user is not authenticated
 */
export async function getServerUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Email confirmation was disabled, so treat all users as verified
    // Users created before disabling may have email_confirmed_at = NULL
    const emailVerified = user.email_confirmed_at !== null || user.created_at !== null;

    return {
      id: user.id,
      email: user.email || "",
      emailVerified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  } catch {
    return null;
  }
}

/**
 * Get the current session from the server
 * Returns null if no active session
 */
export async function getServerSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    // Email confirmation was disabled, so treat all users as verified
    // Users created before disabling may have email_confirmed_at = NULL
    const emailVerified = (session.user.email_confirmed_at !== null) || session.user.created_at !== null;

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token || "",
      expiresAt: session.expires_at || 0,
      user: {
        id: session.user.id,
        email: session.user.email || "",
        emailVerified,
        createdAt: session.user.created_at,
        updatedAt: session.user.updated_at,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Verify if a user is authenticated
 * Use this in protected routes
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getServerUser();
  return user !== null;
}

/**
 * Sign out the current user
 */
export async function signOutServer(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
