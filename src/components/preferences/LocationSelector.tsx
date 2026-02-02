/**
 * Location Preference Selector Component
 * Allows users to set their location and search radius
 */

"use client";

import React, { useState, useEffect } from "react";
import { MapPinIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "../ui/Button";

const PRESET_LOCATIONS = [
  { name: "Dubai", lat: 25.2048, lng: 55.2708 },
  { name: "Abu Dhabi", lat: 24.4539, lng: 54.3773 },
  { name: "Sharjah", lat: 25.3467, lng: 55.4097 },
  { name: "Riyadh", lat: 24.7136, lng: 46.6753 },
];

const RADIUS_OPTIONS = [
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
];

export interface LocationSelectorProps {
  onLocationChange?: (location: { lat: number; lng: number; radiusKm: number }) => void;
}

export function LocationSelector({ onLocationChange }: LocationSelectorProps) {
  const { user } = useAuth();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radiusKm, setRadiusKm] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load user's location preferences
  useEffect(() => {
    if (user) {
      loadLocation();
    }
  }, [user]);

  const loadLocation = async () => {
    try {
      const response = await fetch("/api/user/preferences");
      const data = await response.json();

      if (data.success && data.data) {
        const prefs = data.data;
        if (prefs.location_lat) setLat(prefs.location_lat.toString());
        if (prefs.location_lng) setLng(prefs.location_lng.toString());
        if (prefs.location_radius_km) {
          setRadiusKm(prefs.location_radius_km.toString());
        }
      }
    } catch (err) {
      console.error("Failed to load location:", err);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toString());
        setLng(position.coords.longitude.toString());
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location. Please enter it manually.");
      }
    );
  };

  const saveLocation = async () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radiusKm);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
      alert("Please enter valid values");
      return;
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      alert("Please enter valid coordinates");
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: {
            lat: latNum,
            lng: lngNum,
            radiusKm: radiusNum,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessage({ type: "success", text: "Location preferences saved!" });
          onLocationChange?.({
            lat: latNum,
            lng: lngNum,
            radiusKm: radiusNum,
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

  const selectPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    setLat(preset.lat.toString());
    setLng(preset.lng.toString());
  };

  return (
    <div className="space-y-6">
      {/* Coordinates Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Your Location
          </h3>
          <button
            type="button"
            onClick={getCurrentLocation}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <MapPinIcon className="h-4 w-4" />
            Use my location
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label
              htmlFor="lat"
              className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              Latitude
            </label>
            <input
              id="lat"
              type="text"
              inputMode="decimal"
              placeholder="25.2048"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="lng"
              className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              Longitude
            </label>
            <input
              id="lng"
              type="text"
              inputMode="decimal"
              placeholder="55.2708"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Preset Locations */}
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_LOCATIONS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => selectPreset(preset)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search Radius */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search Radius
        </h3>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRadiusKm(option.value.toString())}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                radiusKm === option.value.toString()
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="space-y-3">
        {message && (
          <div className={`p-3 rounded-lg text-sm text-center ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
          }`}>
            {message.text}
          </div>
        )}
        <Button
          onClick={saveLocation}
          isLoading={isLoading}
          disabled={!lat || !lng}
          className="w-full"
        >
          Save Location Preferences
        </Button>
      </div>
    </div>
  );
}
