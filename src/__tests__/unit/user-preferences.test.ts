/**
 * User Preferences Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  getUserPreferences,
  upsertUserPreferences,
  updateUserPreferences,
  deleteUserPreferences,
  addInterest,
  removeInterest,
  setLocationPreference,
  setPreferredDays,
  setPreferredTimes,
  recordInteraction,
  getAllUserInteractions,
  getUserInteractionsForEvent,
  isEventBookmarked,
  isEventHidden,
  toggleBookmark,
  hideEvent,
  unhideEvent,
} from "../../lib/services/UserPreferencesService";
import * as dbQueries from "../../lib/db/queries";
import type { DbUserPreference, DbUserInteraction } from "../../lib/db/schema";

// Mock database queries
jest.mock("../../lib/db/queries");
jest.mock("../../lib/supabase");

// Mock supabase
const mockSupabase = {
  from: jest.fn(),
};

// Import after mocking
import { supabase } from "../../lib/supabase";

// Set up supabase mock
(supabase as any) = mockSupabase;

describe("UserPreferencesService", () => {
  const mockUserId = "user-123";
  const mockPreferences: DbUserPreference = {
    id: "pref-123",
    user_id: mockUserId,
    interests: ["technology", "networking", "ai"],
    location_lat: 25.2048,
    location_lng: 55.2708,
    location_radius_km: 25,
    preferred_days: ["monday", "wednesday", "friday"],
    preferred_times: ["evening"],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserPreferences", () => {
    it("should return user preferences", async () => {
      const mockFn = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve(mockPreferences));

      const result = await getUserPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
      expect(dbQueries.getUserPreferences).toHaveBeenCalledWith(mockUserId);
    });

    it("should return null when user has no preferences", async () => {
      const mockFn = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve(null));

      const result = await getUserPreferences(mockUserId);

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      const mockFn = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.reject(
        new Error("Database error")
      ));

      await expect(getUserPreferences(mockUserId)).rejects.toThrow("Database error");
    });
  });

  describe("upsertUserPreferences", () => {
    it("should create new preferences", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(null));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        ...mockPreferences,
        interests: ["coding"],
      }));

      const result = await upsertUserPreferences(mockUserId, {
        interests: ["coding"],
      });

      expect(result).toBeDefined();
      expect(result.interests).toEqual(["coding"]);
      expect(dbQueries.upsertUserPreferences).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ interests: ["coding"] })
      );
    });

    it("should update existing preferences", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(mockPreferences));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        ...mockPreferences,
        interests: ["technology", "networking", "ai", "blockchain"],
      }));

      const result = await upsertUserPreferences(mockUserId, {
        interests: ["technology", "networking", "ai", "blockchain"],
      });

      expect(result.interests).toContain("blockchain");
    });

    it("should set location preferences", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(null));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        ...mockPreferences,
        location_lat: 25.0805,
        location_lng: 55.1402,
        location_radius_km: 50,
      }));

      const result = await upsertUserPreferences(mockUserId, {
        location: {
          lat: 25.0805,
          lng: 55.1402,
          radiusKm: 50,
        },
      });

      expect(result.location_lat).toBe(25.0805);
      expect(result.location_lng).toBe(55.1402);
      expect(result.location_radius_km).toBe(50);
    });

    it("should set preferred days and times", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(null));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        ...mockPreferences,
        preferred_days: ["tuesday", "thursday"],
        preferred_times: ["morning", "afternoon"],
      }));

      const result = await upsertUserPreferences(mockUserId, {
        preferredDays: ["tuesday", "thursday"],
        preferredTimes: ["morning", "afternoon"],
      });

      expect(result.preferred_days).toEqual(["tuesday", "thursday"]);
      expect(result.preferred_times).toEqual(["morning", "afternoon"]);
    });
  });

  describe("updateUserPreferences", () => {
    it("should update preferences for existing user", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(mockPreferences));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        ...mockPreferences,
        interests: ["technology", "ai"],
      }));

      const result = await updateUserPreferences(mockUserId, {
        interests: ["technology", "ai"],
      });

      expect(result?.interests).toEqual(["technology", "ai"]);
    });

    it("should return null when user has no preferences", async () => {
      const mockFn = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve(null));

      const result = await updateUserPreferences(mockUserId, {
        interests: ["technology"],
      });

      expect(result).toBeNull();
    });
  });

  describe("deleteUserPreferences", () => {
    it("should delete user preferences", async () => {
      const mockDelete = jest.fn().mockImplementation(() => Promise.resolve({ error: null } as any));
      mockSupabase.from.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          delete: mockDelete,
        }),
      } as any);

      const result = await deleteUserPreferences(mockUserId);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("user_preferences");
    });

    it("should handle deletion errors", async () => {
      const mockDelete = jest.fn().mockImplementation(() => Promise.resolve({
        error: { message: "Delete failed" },
      } as any));
      mockSupabase.from.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          delete: mockDelete,
        }),
      } as any);

      const result = await deleteUserPreferences(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });
  });

  describe("addInterest", () => {
    it("should add interest to existing list", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(mockPreferences as any));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        ...mockPreferences,
        interests: ["technology", "networking", "ai", "blockchain"],
      } as any));

      const result = await addInterest(mockUserId, "blockchain");

      expect(result?.interests).toContain("blockchain");
    });

    it("should create preferences with first interest", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(null as any));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        id: "pref-123",
        user_id: mockUserId,
        interests: ["blockchain"],
        location_lat: null,
        location_lng: null,
        location_radius_km: null,
        preferred_days: null,
        preferred_times: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      } as any));

      const result = await addInterest(mockUserId, "blockchain");

      expect(result?.interests).toEqual(["blockchain"]);
    });

    it("should not duplicate existing interests", async () => {
      const mockFn = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve(mockPreferences as any));

      const result = await addInterest(mockUserId, "technology");

      // When adding duplicate, function returns early without calling upsert
      expect(result?.interests).toEqual(["technology", "networking", "ai"]);
      expect(dbQueries.upsertUserPreferences).not.toHaveBeenCalled();
    });
  });

  describe("removeInterest", () => {
    it("should remove interest from list", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(mockPreferences as any));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        ...mockPreferences,
        interests: ["technology", "ai"],
      } as any));

      const result = await removeInterest(mockUserId, "networking");

      expect(result?.interests).not.toContain("networking");
      expect(result?.interests).toContain("technology");
    });

    it("should return null when user has no preferences", async () => {
      const mockFn = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve(null as any));

      const result = await removeInterest(mockUserId, "technology");

      expect(result).toBeNull();
    });

    it("should handle removing non-existent interest", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(mockPreferences as any));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve(mockPreferences as any));

      const result = await removeInterest(mockUserId, "nonexistent");

      expect(result?.interests).toEqual(mockPreferences.interests);
    });
  });

  describe("setLocationPreference", () => {
    it("should set location preference", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(mockPreferences as any));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        ...mockPreferences,
        location_lat: 25.0805,
        location_lng: 55.1402,
        location_radius_km: 30,
      } as any));

      const result = await setLocationPreference(mockUserId, {
        lat: 25.0805,
        lng: 55.1402,
        radiusKm: 30,
      });

      expect(result?.location_lat).toBe(25.0805);
      expect(result?.location_lng).toBe(55.1402);
      expect(result?.location_radius_km).toBe(30);
    });

    it("should create preferences with location", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(null as any));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        id: "pref-123",
        user_id: mockUserId,
        interests: null,
        location_lat: 25.0805,
        location_lng: 55.1402,
        location_radius_km: 30,
        preferred_days: null,
        preferred_times: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      } as any));

      const result = await setLocationPreference(mockUserId, {
        lat: 25.0805,
        lng: 55.1402,
        radiusKm: 30,
      });

      expect(result?.location_lat).toBe(25.0805);
    });
  });

  describe("setPreferredDays", () => {
    it("should set preferred days", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(mockPreferences as any));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        ...mockPreferences,
        preferred_days: ["tuesday", "thursday"],
      } as any));

      const result = await setPreferredDays(mockUserId, [
        "tuesday",
        "thursday",
      ] as const);

      expect(result?.preferred_days).toEqual(["tuesday", "thursday"]);
    });
  });

  describe("setPreferredTimes", () => {
    it("should set preferred times", async () => {
      const mockFn1 = dbQueries.getUserPreferences as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve(mockPreferences as any));
      const mockFn2 = dbQueries.upsertUserPreferences as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        ...mockPreferences,
        preferred_times: ["morning", "afternoon"],
      } as any));

      const result = await setPreferredTimes(mockUserId, [
        "morning",
        "afternoon",
      ] as const);

      expect(result?.preferred_times).toEqual(["morning", "afternoon"]);
    });
  });
});

describe("User Interactions", () => {
  const mockUserId = "user-123";
  const mockEventId = "event-123";
  const mockInteraction: DbUserInteraction = {
    id: "interaction-123",
    user_id: mockUserId,
    event_id: mockEventId,
    interaction_type: "view",
    metadata: null,
    created_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("recordInteraction", () => {
    it("should record view interaction", async () => {
      const mockFn = dbQueries.recordInteraction as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve(mockInteraction as any));

      const result = await recordInteraction(mockUserId, mockEventId, "view");

      expect(result.interaction_type).toBe("view");
      expect(dbQueries.recordInteraction).toHaveBeenCalledWith({
        user_id: mockUserId,
        event_id: mockEventId,
        interaction_type: "view",
        metadata: null,
      });
    });

    it("should record interaction with metadata", async () => {
      const mockFn = dbQueries.recordInteraction as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve({
        ...mockInteraction,
        metadata: { source: "feed" },
      } as any));

      const result = await recordInteraction(
        mockUserId,
        mockEventId,
        "click",
        { source: "feed" }
      );

      expect(result.metadata).toEqual({ source: "feed" });
    });
  });

  describe("getUserInteractions", () => {
    it("should get user interactions for event", async () => {
      const mockFn = dbQueries.getUserInteractionsForEvent as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve([
        mockInteraction,
      ] as any));

      const result = await getUserInteractionsForEvent(mockUserId, mockEventId);

      expect(result).toHaveLength(1);
      expect(result[0].interaction_type).toBe("view");
    });

    it("should get all user interactions", async () => {
      const mockFn = dbQueries.getUserInteractions as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve([
        mockInteraction,
        { ...mockInteraction, id: "interaction-456", interaction_type: "click" },
      ] as any));

      const result = await getAllUserInteractions(mockUserId);

      expect(result).toHaveLength(2);
    });
  });

  describe("isEventBookmarked", () => {
    it("should return true when event is bookmarked", async () => {
      const mockFn = dbQueries.getUserInteractionsForEvent as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve([
        { ...mockInteraction, interaction_type: "bookmark" },
      ] as any));

      const result = await isEventBookmarked(mockUserId, mockEventId);

      expect(result).toBe(true);
    });

    it("should return false when event is not bookmarked", async () => {
      const mockFn = dbQueries.getUserInteractionsForEvent as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve([
        mockInteraction,
      ] as any));

      const result = await isEventBookmarked(mockUserId, mockEventId);

      expect(result).toBe(false);
    });
  });

  describe("isEventHidden", () => {
    it("should return true when event is hidden", async () => {
      const mockFn = dbQueries.getUserInteractionsForEvent as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve([
        { ...mockInteraction, interaction_type: "hide" },
      ] as any));

      const result = await isEventHidden(mockUserId, mockEventId);

      expect(result).toBe(true);
    });

    it("should return false when event is not hidden", async () => {
      const mockFn = dbQueries.getUserInteractionsForEvent as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve([
        mockInteraction,
      ] as any));

      const result = await isEventHidden(mockUserId, mockEventId);

      expect(result).toBe(false);
    });
  });

  describe("toggleBookmark", () => {
    it("should add bookmark when not bookmarked", async () => {
      const mockFn1 = dbQueries.getUserInteractionsForEvent as unknown as jest.Mock;
      mockFn1.mockImplementation(() => Promise.resolve([] as any));
      const mockFn2 = dbQueries.recordInteraction as unknown as jest.Mock;
      mockFn2.mockImplementation(() => Promise.resolve({
        ...mockInteraction,
        interaction_type: "bookmark",
      } as any));

      const result = await toggleBookmark(mockUserId, mockEventId);

      expect(result.bookmarked).toBe(true);
      expect(result.interaction?.interaction_type).toBe("bookmark");
    });

    it("should remove bookmark when already bookmarked", async () => {
      const mockFn = dbQueries.getUserInteractionsForEvent as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve([
        { ...mockInteraction, interaction_type: "bookmark" },
      ] as any));

      const result = await toggleBookmark(mockUserId, mockEventId);

      expect(result.bookmarked).toBe(false);
    });
  });

  describe("hideEvent", () => {
    it("should hide event", async () => {
      const mockFn = dbQueries.recordInteraction as unknown as jest.Mock;
      mockFn.mockImplementation(() => Promise.resolve({
        ...mockInteraction,
        interaction_type: "hide",
      } as any));

      const result = await hideEvent(mockUserId, mockEventId);

      expect(result.interaction_type).toBe("hide");
    });
  });

  describe("unhideEvent", () => {
    it("should unhide event", async () => {
      const mockDelete = jest.fn().mockImplementation(() => Promise.resolve({ error: null } as any));
      const mockEq3 = jest.fn().mockReturnValue({ delete: mockDelete } as any);
      const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 } as any);
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 } as any);
      mockSupabase.from.mockReturnValue({ eq: mockEq1 } as any);

      const result = await unhideEvent(mockUserId, mockEventId);

      expect(result.success).toBe(true);
      // Verify the chain: eq("user_id") -> eq("event_id") -> eq("interaction_type") -> delete()
      expect(mockSupabase.from).toHaveBeenCalledWith("user_interactions");
      expect(mockEq1).toHaveBeenCalledWith("user_id", mockUserId);
      expect(mockEq2).toHaveBeenCalledWith("event_id", mockEventId);
      expect(mockEq3).toHaveBeenCalledWith("interaction_type", "hide");
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should handle unhide errors", async () => {
      const mockDelete = jest.fn().mockImplementation(() => Promise.resolve({
        error: { message: "Delete failed" },
      } as any));
      const mockEq3 = jest.fn().mockReturnValue({ delete: mockDelete } as any);
      const mockEq2 = jest.fn().mockReturnValue({ eq: mockEq3 } as any);
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 } as any);
      mockSupabase.from.mockReturnValue({ eq: mockEq1 } as any);

      const result = await unhideEvent(mockUserId, mockEventId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });
  });
});
