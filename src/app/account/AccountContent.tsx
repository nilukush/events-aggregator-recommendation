/**
 * Account Page Content
 * Client component that fetches and displays user information
 */

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserPreferences {
  interests?: string[];
  location_lat?: number | null;
  location_lng?: number | null;
  location_radius_km?: number;
  preferred_days?: string[];
  preferred_times?: string[];
}

export function AccountContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/signin");
      return;
    }

    // Fetch user preferences
    async function loadPreferences() {
      try {
        const response = await fetch("/api/user/preferences");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setPreferences(data.data);
          }
        }
      } catch (error) {
        console.error("Failed to load preferences:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Account
        </h1>

        <div className="flex items-start gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {user.email?.[0].toUpperCase() || "U"}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {user.email}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Signed in
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Link
            href="/preferences"
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-.826 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-.826a1.724 1.724 0 00-1.065-2.572c-.426-1.756-2.924-1.756-3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37.826a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.351.724 1.724 0 002.573-1.066c1.543.94 3.31-.826 2.37-.826a1.724 1.724 0 001.066-2.572c.426-1.756 2.924-1.756 3.35 0z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Preferences</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {loading
                    ? "Loading..."
                    : preferences
                    ? `${preferences.interests?.length || 0} interests, ${preferences.preferred_days?.length || 0} preferred days`
                    : "Not configured"}
                </p>
              </div>
            </div>
            <svg className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Preferences Summary */}
      {preferences && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Preferences
          </h3>

          <div className="space-y-4">
            {/* Location */}
            {preferences.location_lat && preferences.location_lng && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {preferences.location_lat.toFixed(4)}°, {preferences.location_lng.toFixed(4)}°
                  {preferences.location_radius_km && ` (${preferences.location_radius_km}km radius)`}
                </p>
              </div>
            )}

            {/* Interests */}
            {preferences.interests && preferences.interests.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interests
                </p>
                <div className="flex flex-wrap gap-2">
                  {preferences.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Days */}
            {preferences.preferred_days && preferences.preferred_days.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Days
                </p>
                <div className="flex flex-wrap gap-2">
                  {preferences.preferred_days.map((day) => (
                    <span
                      key={day}
                      className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm capitalize"
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Times */}
            {preferences.preferred_times && preferences.preferred_times.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Times
                </p>
                <div className="flex flex-wrap gap-2">
                  {preferences.preferred_times.map((time) => (
                    <span
                      key={time}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm capitalize"
                    >
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* No Preferences */}
            {(!preferences.interests || preferences.interests.length === 0) &&
              (!preferences.preferred_days || preferences.preferred_days.length === 0) &&
              (!preferences.preferred_times || preferences.preferred_times.length === 0) && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                You haven't set any preferences yet.{" "}
                <Link href="/preferences" className="text-blue-600 hover:text-blue-700">
                  Set up your preferences
                </Link>{" "}
                to get personalized event recommendations.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Account Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account Actions
        </h3>

        <div className="space-y-3">
          <Link
            href="/"
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Browse Events</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Discover new events</p>
              </div>
            </div>
            <svg className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
