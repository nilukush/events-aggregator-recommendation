/**
 * Next.js Middleware
 *
 * Handles authentication for protected routes
 * Redirects unauthenticated users to sign-in page
 * Follows official Supabase SSR pattern
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes that don't require authentication
 */
const publicRoutes = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/reset-password",
  "/api/auth",
  "/events",
];

/**
 * Routes that require authentication
 */
const protectedRoutes = [
  "/dashboard",
  "/preferences",
  "/bookmarks",
  "/api/user",
  "/api/recommendations",
  "/api/interactions",
];

/**
 * API routes that require authentication
 */
const protectedApiRoutes = [
  "/api/user",
  "/api/recommendations",
  "/api/interactions",
  "/api/preferences",
];

/**
 * Check if a path is a public route
 */
function isPublicRoute(path: string): boolean {
  return publicRoutes.some((route) => path.startsWith(route));
}

/**
 * Check if a path is a protected route
 */
function isProtectedRoute(path: string): boolean {
  return protectedRoutes.some((route) => path.startsWith(route));
}

/**
 * Check if a path is a protected API route
 */
function isProtectedApiRoute(path: string): boolean {
  return protectedApiRoutes.some((route) => path.startsWith(route));
}

/**
 * Middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // Skip files with extensions
  ) {
    return NextResponse.next();
  }

  // Create response that will be modified
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client with proper cookie handling
  // CRITICAL: We must set cookies on BOTH request AND response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          // Set on both request and response to properly propagate auth
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.delete(name);
          response.cookies.delete(name);
        },
      },
    }
  );

  // Get the user - this triggers token refresh if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuth = !!user;

  // Handle protected API routes
  if (isProtectedApiRoute(pathname)) {
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    return response;
  }

  // Handle protected routes - redirect to sign-in if not authenticated
  if (isProtectedRoute(pathname) && !isAuth) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuth && (pathname.startsWith("/auth/signin") || pathname.startsWith("/auth/signup"))) {
    // Check if there's a redirectTo parameter
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    if (redirectTo) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
