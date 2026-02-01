/**
 * Authentication Context Provider
 *
 * Provides auth state and actions to all client components
 * Uses Zustand for state management with React Context for dependency injection
 */

"use client";

import React, { useEffect, useMemo } from "react";
import type {
  AuthUser,
  AuthSession,
  SignInCredentials,
  SignUpCredentials,
} from "./types";
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  getCurrentSession,
  onAuthStateChange,
  resetPassword,
  updatePassword,
} from "./client";

/**
 * Auth state interface
 */
interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
}

/**
 * Auth actions interface
 */
interface AuthActions {
  signIn: (credentials: SignInCredentials) => Promise<{ success: boolean; error?: string }>;
  signUp: (credentials: SignUpCredentials) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

/**
 * Combined auth state and actions
 */
interface AuthContextValue extends AuthState, AuthActions {}

const AuthContext = React.createContext<AuthContextValue | null>(null);

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isEmailVerified: false,
  });

  // Update auth state helper
  const updateState = React.useCallback((user: AuthUser | null, session: AuthSession | null) => {
    setState({
      user,
      session,
      isLoading: false,
      isAuthenticated: user !== null,
      isEmailVerified: user?.emailVerified || false,
    });
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function loadInitialSession() {
      try {
        const [user, session] = await Promise.all([
          getCurrentUser(),
          getCurrentSession(),
        ]);

        if (mounted) {
          updateState(user, session);
        }
      } catch {
        if (mounted) {
          updateState(null, null);
        }
      }
    }

    loadInitialSession();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange((event, session) => {
      if (mounted) {
        const user = session?.user || null;
        updateState(user, session);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [updateState]);

  // Auth actions
  const actions = useMemo<AuthActions>(
    () => ({
      signIn: async (credentials: SignInCredentials) => {
        const result = await signIn(credentials);
        if (result.success && result.user && result.session) {
          updateState(result.user, result.session);
        }
        return result;
      },

      signUp: async (credentials: SignUpCredentials) => {
        const result = await signUp(credentials);
        if (result.success && result.user) {
          // Session might be null if email verification is required
          updateState(result.user, result.session || null);
        }
        return result;
      },

      signOut: async () => {
        const result = await signOut();
        if (result.success) {
          updateState(null, null);
        }
        return result;
      },

      resetPassword: async (email: string) => {
        return resetPassword(email);
      },

      updatePassword: async (newPassword: string) => {
        return updatePassword(newPassword);
      },

      refresh: async () => {
        const [user, session] = await Promise.all([
          getCurrentUser(),
          getCurrentSession(),
        ]);
        updateState(user, session);
      },
    }),
    [updateState]
  );

  const contextValue = useMemo<AuthContextValue>(
    () => ({ ...state, ...actions }),
    [state, actions]
  );

  return React.createElement(AuthContext.Provider, { value: contextValue }, children);
}

/**
 * Hook to access auth context
 * Throws an error if used outside of AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

/**
 * Hook to get current user
 */
export function useUser(): AuthUser | null {
  const { user } = useAuth();
  return user;
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated, isLoading } = useAuth();
  // Consider authenticated only when not loading and has user
  return !isLoading && isAuthenticated;
}

/**
 * Hook to require authentication
 * Throws an error if user is not authenticated (useful in protected components)
 */
export function useRequireAuth(): AuthUser {
  const user = useUser();
  const { isLoading } = useAuth();

  if (isLoading) {
    throw new Error("Loading authentication state...");
  }

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}

/**
 * HOC to protect components that require authentication
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P & { user: AuthUser }>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    try {
      const user = useRequireAuth();
      return React.createElement(Component, { ...props, user });
    } catch (error) {
      // Could redirect or show loading state here
      return React.createElement("div", null, "Authentication required");
    }
  };
}
