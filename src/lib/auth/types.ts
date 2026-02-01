/**
 * Authentication Types
 *
 * Type definitions for authentication system
 */

/**
 * Auth user profile from Supabase
 */
export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Session information
 */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

/**
 * Sign in credentials
 */
export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Sign up credentials
 */
export interface SignUpCredentials {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Auth result
 */
export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
}

/**
 * Auth error codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  WEAK_PASSWORD = "WEAK_PASSWORD",
  EMAIL_ALREADY_IN_USE = "EMAIL_ALREADY_IN_USE",
  EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  UNAUTHORIZED = "UNAUTHORIZED",
  UNKNOWN = "UNKNOWN",
}

/**
 * Auth error
 */
export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Auth provider types for OAuth
 */
export type OAuthProvider = "google" | "github" | "facebook" | "twitter";

/**
 * OAuth result
 */
export interface OAuthResult {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
}
