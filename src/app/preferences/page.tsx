/**
 * User Preferences Page
 * Allows users to manage their event preferences
 */

"use client";

import React from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { LocationSelector } from "@/components/preferences/LocationSelector";
import { InterestsSelector } from "@/components/preferences/InterestsSelector";
import { TimeDaySelector } from "@/components/preferences/TimeDaySelector";
import { PageLoading } from "@/components/ui/LoadingSpinner";
import {
  MapPinIcon,
  HeartIcon,
  ClockIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

export default function PreferencesPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<
    "location" | "interests" | "timeDay"
  >("location");

  const tabs = [
    { id: "location" as const, label: "Location", icon: MapPinIcon },
    { id: "interests" as const, label: "Interests", icon: HeartIcon },
    { id: "timeDay" as const, label: "Time & Day", icon: ClockIcon },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <UserCircleIcon className="mx-auto h-16 w-16 text-blue-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Preferences
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Sign in to customize your event preferences and get personalized
            recommendations.
          </p>
          <a
            href="/auth/signin"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Your Preferences
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Customize your event discovery experience
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          {activeTab === "location" && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Location Preferences
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Set your location to find events near you. Choose from preset
                cities or enter your coordinates manually.
              </p>
              <LocationSelector />
            </div>
          )}

          {activeTab === "interests" && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Your Interests
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add topics and categories you're interested in. We'll use these
                to recommend relevant events.
              </p>
              <InterestsSelector />
            </div>
          )}

          {activeTab === "timeDay" && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Time & Day Preferences
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Tell us when you prefer to attend events. We'll prioritize
                events that match your schedule.
              </p>
              <TimeDaySelector />
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
            How we use your preferences
          </h3>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Your preferences help us personalize your event recommendations on
            the{" "}
            <a href="/recommendations" className="underline hover:no-underline">
              For You
            </a>{" "}
            page. You can update these settings at any time.
          </p>
        </div>
      </div>
    </main>
  );
}
