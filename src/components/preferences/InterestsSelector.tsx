/**
 * Interests Selector Component
 * Allows users to add/remove their interests
 */

"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "../ui/Button";

const SUGGESTED_INTERESTS = [
  "technology",
  "networking",
  "blockchain",
  "ai",
  "machine learning",
  "web3",
  "startup",
  "business",
  "finance",
  "design",
  "music",
  "arts",
  "sports",
  "food & drink",
  "education",
  "health",
  "gaming",
];

export interface InterestsSelectorProps {
  onInterestsChange?: (interests: string[]) => void;
}

export function InterestsSelector({
  onInterestsChange,
}: InterestsSelectorProps) {
  const { user } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newInterest, setNewInterest] = useState("");

  // Load user's interests
  useEffect(() => {
    if (user) {
      loadInterests();
    }
  }, [user]);

  const loadInterests = async () => {
    try {
      const response = await fetch("/api/user/preferences");
      const data = await response.json();

      if (data.success && data.data?.interests) {
        setInterests(data.data.interests);
      }
    } catch (err) {
      console.error("Failed to load interests:", err);
    }
  };

  const addInterest = async (interest: string) => {
    if (!interest || interests.includes(interest)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.interests) {
          setInterests(data.data.interests);
          onInterestsChange?.(data.data.interests);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeInterest = async (interest: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/interests/${encodeURIComponent(interest)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.interests) {
          setInterests(data.data.interests);
          onInterestsChange?.(data.data.interests);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInterest = () => {
    const trimmed = newInterest.trim().toLowerCase();
    if (trimmed) {
      addInterest(trimmed);
      setNewInterest("");
    }
  };

  const availableSuggestions = SUGGESTED_INTERESTS.filter(
    (i) => !interests.includes(i)
  );

  return (
    <div className="space-y-4">
      {/* Current Interests */}
      {interests.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <button
                key={interest}
                onClick={() => removeInterest(interest)}
                disabled={isLoading}
                className="group inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
              >
                {interest}
                <XMarkIcon className="h-4 w-4 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add New Interest */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Add Interest
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. photography"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddInterest()}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={handleAddInterest}
            disabled={!newInterest.trim() || isLoading}
            size="sm"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Suggested Interests */}
      {availableSuggestions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Suggested
          </h3>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.slice(0, 8).map((interest) => (
              <button
                key={interest}
                onClick={() => addInterest(interest)}
                disabled={isLoading}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
              >
                + {interest}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
