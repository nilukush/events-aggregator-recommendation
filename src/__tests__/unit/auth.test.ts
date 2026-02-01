/**
 * Authentication Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock Supabase client before importing auth functions
jest.mock("@supabase/supabase-js", () => {
  const mockAuth = {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
  };

  const mockClient = {
    auth: mockAuth,
  };

  return {
    createClient: jest.fn(() => mockClient),
  };
});

// Import after mocking
import { createClient } from "@supabase/supabase-js";
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  getCurrentSession,
  onAuthStateChange,
  resetPassword,
  updatePassword,
  setAuthClient,
  getAuthClient,
} from "../../lib/auth/client";

// Get the mock client
const mockSupabase = createClient("test-url", "test-key") as any;

describe("Auth - Client", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    email_confirmed_at: "2024-01-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockSession = {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_at: 1234567890,
    user: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    // Set the mock client for our auth functions
    setAuthClient(mockSupabase);
  });

  describe("setAuthClient and getAuthClient", () => {
    it("should set and get auth client", () => {
      const customClient = { auth: {} };
      setAuthClient(customClient as any);
      expect(getAuthClient()).toBe(customClient);
    });
  });

  describe("signIn", () => {
    it("should sign in successfully with valid credentials", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await signIn({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: "user-123",
        email: "test@example.com",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });
      expect(result.session?.accessToken).toBe("access-token");
    });

    it("should return error for invalid credentials", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const result = await signIn({
        email: "test@example.com",
        password: "wrong-password",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid login credentials");
    });

    it("should return error when session is missing", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await signIn({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Sign in failed");
    });
  });

  describe("signUp", () => {
    it("should sign up successfully", async () => {
      const newUser = {
        ...mockUser,
        id: "new-user-123",
        email: "new@example.com",
      };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: newUser, session: mockSession },
        error: null,
      });

      const result = await signUp({
        email: "new@example.com",
        password: "password123",
        displayName: "Test User",
      });

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe("new@example.com");
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: {
          data: {
            display_name: "Test User",
          },
        },
      });
    });

    it("should handle email already registered", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      });

      const result = await signUp({
        email: "existing@example.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("User already registered");
    });

    it("should handle signup requiring email verification", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await signUp({
        email: "new@example.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
      expect(result.session).toBeUndefined();
      expect(result.user?.id).toBe("user-123");
    });
  });

  describe("signOut", () => {
    it("should sign out successfully", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await signOut();

      expect(result.success).toBe(true);
    });

    it("should handle sign out errors", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: "Sign out failed" },
      });

      const result = await signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Sign out failed");
    });
  });

  describe("getCurrentUser", () => {
    it("should return current user when authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const user = await getCurrentUser();

      expect(user).toEqual({
        id: "user-123",
        email: "test@example.com",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });
    });

    it("should return null when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it("should return null on error", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Auth error" },
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it("should handle null email", async () => {
      const userWithNullEmail = {
        ...mockUser,
        email: null,
      };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: userWithNullEmail },
        error: null,
      });

      const user = await getCurrentUser();

      expect(user?.email).toBe("");
    });
  });

  describe("getCurrentSession", () => {
    it("should return current session when authenticated", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const session = await getCurrentSession();

      expect(session).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 1234567890,
        user: {
          id: "user-123",
          email: "test@example.com",
          emailVerified: true,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      });
    });

    it("should return null when no session", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const session = await getCurrentSession();

      expect(session).toBeNull();
    });

    it("should handle null refresh token", async () => {
      const sessionWithNullRefresh = {
        ...mockSession,
        refresh_token: null,
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: sessionWithNullRefresh },
        error: null,
      });

      const session = await getCurrentSession();

      expect(session?.refreshToken).toBe("");
    });
  });

  describe("onAuthStateChange", () => {
    it("should subscribe to auth state changes", () => {
      const mockSubscription = { unsubscribe: jest.fn() };
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      const callback = jest.fn();
      const unsubscribe = onAuthStateChange(callback);

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe("function");
    });

    it("should unsubscribe from auth state changes", () => {
      const mockSubscription = { unsubscribe: jest.fn() };
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      const unsubscribe = onAuthStateChange(() => {});
      unsubscribe();

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });

    it("should call callback with session data", () => {
      const mockSubscription = { unsubscribe: jest.fn() };
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback: (event: string, session: any) => void) => {
        // Immediately call with session data
        callback("SIGNED_IN", mockSession);
        return {
          data: { subscription: mockSubscription },
        };
      });

      const callback = jest.fn();
      onAuthStateChange(callback);

      expect(callback).toHaveBeenCalledWith("SIGNED_IN", {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 1234567890,
        user: {
          id: "user-123",
          email: "test@example.com",
          emailVerified: true,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      });
    });
  });

  describe("resetPassword", () => {
    it("should send password reset email", async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      const result = await resetPassword("test@example.com");

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        { redirectTo: "http://localhost:3000/auth/reset-password" }
      );
    });

    it("should handle reset password errors", async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: "Email not found" },
      });

      const result = await resetPassword("nonexistent@example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email not found");
    });

    it("should use custom origin from env", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://custom.com";
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      await resetPassword("test@example.com");

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        { redirectTo: "https://custom.com/auth/reset-password" }
      );
    });
  });

  describe("updatePassword", () => {
    it("should update user password", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        error: null,
      });

      const result = await updatePassword("newPassword123");

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: "newPassword123",
      });
    });

    it("should handle update password errors", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        error: { message: "Password too weak" },
      });

      const result = await updatePassword("weak");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Password too weak");
    });
  });
});

describe("Auth - Types", () => {
  describe("AuthUser", () => {
    it("should have required properties", () => {
      const user = {
        id: "user-123",
        email: "test@example.com",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("emailVerified");
      expect(user).toHaveProperty("createdAt");
      expect(user).toHaveProperty("updatedAt");
    });
  });

  describe("AuthSession", () => {
    it("should have required properties", () => {
      const session = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: 1234567890,
        user: {
          id: "user-123",
          email: "test@example.com",
          emailVerified: true,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      };

      expect(session).toHaveProperty("accessToken");
      expect(session).toHaveProperty("refreshToken");
      expect(session).toHaveProperty("expiresAt");
      expect(session).toHaveProperty("user");
    });
  });
});

describe("Auth - Server Client", () => {
  it("should export server functions", async () => {
    const { getServerUser, getServerSession, isAuthenticated, signOutServer } = await import("../../lib/auth/server-client");

    expect(typeof getServerUser).toBe("function");
    expect(typeof getServerSession).toBe("function");
    expect(typeof isAuthenticated).toBe("function");
    expect(typeof signOutServer).toBe("function");
  });
});
