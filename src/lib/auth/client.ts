/**
 * Supabase Auth Client
 *
 * Client-side Supabase auth utilities
 * For use in Client Components
 */

import { createClient } from "@supabase/supabase-js";
import type {
  AuthUser,
  AuthSession,
  SignInCredentials,
  SignUpCredentials,
  AuthResult,
  AuthErrorCode,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Create Supabase auth client
 * Can be injected for testing
 */
function createAuthClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce", // Use PKCE for better security
    },
  });
}

// Default client (can be overridden for testing)
// Lazy initialization to avoid issues during SSR
let supabaseAuth: SupabaseClient | null = null;

/**
 * Get or create the auth client
 */
function getSupabaseAuth(): SupabaseClient {
  if (!supabaseAuth) {
    supabaseAuth = createAuthClient();
  }
  return supabaseAuth;
}

/**
 * Set the auth client (for testing)
 */
export function setAuthClient(client: SupabaseClient): void {
  supabaseAuth = client;
}

/**
 * Get the current auth client
 */
export function getAuthClient(): SupabaseClient {
  return getSupabaseAuth();
}

/**
 * Map Supabase error to our AuthErrorCode
 */
function mapAuthError(error: { message: string }): AuthErrorCode {
  const message = error.message.toLowerCase();

  if (message.includes("invalid") || message.includes("wrong") || message.includes("credentials")) {
    return "INVALID_CREDENTIALS" as AuthErrorCode;
  }
  if (message.includes("weak") || message.includes("password")) {
    return "WEAK_PASSWORD" as AuthErrorCode;
  }
  if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
    return "EMAIL_ALREADY_IN_USE" as AuthErrorCode;
  }
  if (message.includes("email") && message.includes("not") && message.includes("verified")) {
    return "EMAIL_NOT_VERIFIED" as AuthErrorCode;
  }
  if (message.includes("session") || message.includes("expired") || message.includes("token")) {
    return "SESSION_EXPIRED" as AuthErrorCode;
  }

  return "UNKNOWN" as AuthErrorCode;
}

/**
 * Convert Supabase user to AuthUser
 */
function toAuthUser(user: {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}): AuthUser {
  return {
    id: user.id,
    email: user.email || "",
    emailVerified: user.email_confirmed_at !== null && user.email_confirmed_at !== undefined,
    createdAt: user.created_at || "",
    updatedAt: user.updated_at || "",
  };
}

/**
 * Sign in with email and password
 */
export async function signIn(credentials: SignInCredentials): Promise<AuthResult> {
  try {
    const { data, error } = await getSupabaseAuth().auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Sign in failed",
      };
    }

    if (!data.session || !data.user) {
      return {
        success: false,
        error: "Sign in failed",
      };
    }

    return {
      success: true,
      user: toAuthUser(data.user),
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token || "",
        expiresAt: data.session.expires_at || 0,
        user: toAuthUser(data.user),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sign up with email and password
 * Note: Email confirmation is disabled for immediate sign-in
 */
export async function signUp(credentials: SignUpCredentials): Promise<AuthResult> {
  try {
    const { data, error } = await getSupabaseAuth().auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          display_name: credentials.displayName,
        },
        emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/preferences`,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Email confirmation might be required
    if (!data.session) {
      return {
        success: true,
        user: data.user ? toAuthUser(data.user) : undefined,
      };
    }

    // At this point we have a session, which implies we have a user
    const user = data.user;
    if (!user) {
      return {
        success: false,
        error: "User data missing",
      };
    }

    return {
      success: true,
      user: toAuthUser(user),
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token || "",
        expiresAt: data.session.expires_at || 0,
        user: toAuthUser(user),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getSupabaseAuth().auth.signOut();

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

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await getSupabaseAuth().auth.getUser();

    if (error || !user) {
      return null;
    }

    return toAuthUser(user);
  } catch {
    return null;
  }
}

/**
 * Get the current session
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    const { data: { session }, error } = await getSupabaseAuth().auth.getSession();

    if (error || !session) {
      return null;
    }

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token || "",
      expiresAt: session.expires_at || 0,
      user: toAuthUser(session.user),
    };
  } catch {
    return null;
  }
}

/**
 * Listen to auth state changes
 * Returns a function to unsubscribe
 */
export function onAuthStateChange(
  callback: (event: string, session: AuthSession | null) => void
): () => void {
  const subscription = getSupabaseAuth().auth.onAuthStateChange((event, session) => {
    callback(
      event,
      session
        ? {
            accessToken: session.access_token,
            refreshToken: session.refresh_token || "",
            expiresAt: session.expires_at || 0,
            user: toAuthUser(session.user),
          }
        : null
    );
  });

  return () => {
    subscription.data.subscription.unsubscribe();
  };
}

/**
 * Get current origin (handles SSR)
 */
function getOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getSupabaseAuth().auth.resetPasswordForEmail(email, {
      redirectTo: `${getOrigin()}/auth/reset-password`,
    });

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

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getSupabaseAuth().auth.updateUser({
      password: newPassword,
    });

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
