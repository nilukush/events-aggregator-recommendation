/**
 * Time/Day Preference Selector Component
 * Allows users to set their preferred event days and times
 */

"use client";

import React, { useState, useEffect } from "react";
import { ClockIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "../ui/Button";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIME_SLOTS = [
  { value: "morning", label: "Morning", hours: [6, 7, 8, 9, 10, 11] },
  { value: "afternoon", label: "Afternoon", hours: [12, 13, 14, 15, 16, 17] },
  { value: "evening", label: "Evening", hours: [18, 19, 20, 21] },
  { value: "night", label: "Night", hours: [22, 23, 0, 1, 2] },
];

export interface TimeDaySelectorProps {
  onPreferencesChange?: (preferences: {
    preferredDays: number[];
    preferredTimes: string[];
  }) => void;
}

export function TimeDaySelector({
  onPreferencesChange,
}: TimeDaySelectorProps) {
  const { user } = useAuth();
  const [preferredDays, setPreferredDays] = useState<number[]>([]);
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load user's time/day preferences
  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const response = await fetch("/api/user/preferences");
      const data = await response.json();

      if (data.success && data.data) {
        const prefs = data.data;
        if (prefs.preferred_days) {
          setPreferredDays(prefs.preferred_days);
        }
        if (prefs.preferred_times) {
          setPreferredTimes(prefs.preferred_times);
        }
      }
    } catch (err) {
      console.error("Failed to load time/day preferences:", err);
    }
  };

  const toggleDay = (dayValue: number) => {
    const newDays = preferredDays.includes(dayValue)
      ? preferredDays.filter((d) => d !== dayValue)
      : [...preferredDays, dayValue].sort((a, b) => a - b);
    setPreferredDays(newDays);
  };

  const toggleTime = (timeValue: string) => {
    const newTimes = preferredTimes.includes(timeValue)
      ? preferredTimes.filter((t) => t !== timeValue)
      : [...preferredTimes, timeValue];
    setPreferredTimes(newTimes);
  };

  const savePreferences = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeDay: {
            preferredDays,
            preferredTimes,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessage({ type: "success", text: "Preferences saved successfully!" });
          onPreferencesChange?.({
            preferredDays,
            preferredTimes,
          });
          // Clear message after 3 seconds
          setTimeout(() => setMessage(null), 3000);
        } else {
          setMessage({ type: "error", text: data.error || "Failed to save preferences" });
        }
      } else {
        const errorData = await response.json();
        setMessage({ type: "error", text: errorData.error || "Failed to save" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const selectWeekdays = () => {
    setPreferredDays([1, 2, 3, 4, 5]);
  };

  const selectWeekends = () => {
    setPreferredDays([0, 6]);
  };

  const selectAllDays = () => {
    setPreferredDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const selectAllTimes = () => {
    setPreferredTimes(["morning", "afternoon", "evening", "night"]);
  };

  const clearAll = () => {
    setPreferredDays([]);
    setPreferredTimes([]);
  };

  return (
    <div className="space-y-6">
      {/* Preferred Days */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Preferred Days
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectWeekdays}
              className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Weekdays
            </button>
            <button
              type="button"
              onClick={selectWeekends}
              className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Weekends
            </button>
            <button
              type="button"
              onClick={selectAllDays}
              className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              All Days
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`py-2 px-1 text-xs sm:text-sm rounded-lg transition-colors ${
                preferredDays.includes(day.value)
                  ? "bg-blue-600 text-white font-medium"
                  : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {day.label.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Preferred Times */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Preferred Times
          </h3>
          <button
            type="button"
            onClick={selectAllTimes}
            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Select All
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.value}
              type="button"
              onClick={() => toggleTime(slot.value)}
              className={`py-3 px-4 rounded-lg transition-colors ${
                preferredTimes.includes(slot.value)
                  ? "bg-purple-600 text-white font-medium"
                  : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <div className="text-sm font-medium">{slot.label}</div>
              <div className="text-xs opacity-75">
                {slot.hours[0]}:00 - {slot.hours[slot.hours.length - 1]}:59
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {(preferredDays.length > 0 || preferredTimes.length > 0) && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            Your Preferences
          </h4>
          {preferredDays.length > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
              Preferred:{" "}
              {preferredDays.map((d) => DAYS_OF_WEEK[d].label).join(", ")}
            </p>
          )}
          {preferredTimes.length > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Times:{" "}
              {TIME_SLOTS.filter((t) => preferredTimes.includes(t.value))
                .map((t) => t.label)
                .join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Success/Error Message */}
      {message && (
        <div className={`p-3 rounded-lg text-sm text-center ${
          message.type === "success"
            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
        }`}>
          {message.text}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={savePreferences}
          isLoading={isLoading}
          className="flex-1"
        >
          Save Preferences
        </Button>
        <Button
          onClick={clearAll}
          variant="outline"
          disabled={preferredDays.length === 0 && preferredTimes.length === 0}
        >
          Clear All
        </Button>
      </div>
    </div>
  );
}
