/**
 * Recommendations API Routes Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { NextRequest } from "next/server";
import { GET, DELETE, PUT } from "../../app/api/recommendations/route";
import * as auth from "../../lib/auth/server-client";
import * as RecommendationEngine from "../../lib/services/RecommendationEngine";

// Mock dependencies
jest.mock("../../lib/auth/server-client");
jest.mock("../../lib/services/RecommendationEngine");

const mockAuth = auth as unknown as { getServerUser: jest.Mock };
const mockRecEngine = RecommendationEngine as unknown as {
  getRecommendationsForUser: jest.Mock;
  getPersonalizedFeed: jest.Mock;
  clearUserRecommendations: jest.Mock;
  recordRecommendationFeedback: jest.Mock;
};

const mockUser = {
  id: "user-123",
  email: "user@example.com",
  emailVerified: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockRecommendations = [
  {
    id: "rec-1",
    user_id: mockUser.id,
    event_id: "event-1",
    score: 0.9,
    reason: "matches your interests",
    algorithm: "hybrid" as const,
    expires_at: "2024-03-22T00:00:00Z",
    created_at: "2024-03-15T00:00:00Z",
    event: {
      id: "event-1",
      source_id: "source-1",
      external_id: "ext-1",
      title: "Tech Meetup",
      description: "A tech meetup",
      event_url: "https://example.com/event-1",
      image_url: "https://example.com/image-1.jpg",
      start_time: "2024-03-20T18:00:00Z",
      end_time: "2024-03-20T20:00:00Z",
      location_name: "Dubai Tech Hub",
      location_lat: 25.2048,
      location_lng: 55.2708,
      is_virtual: false,
      category: "Technology",
      tags: ["tech", "meetup"],
      raw_data: null,
      embedding: null,
      fetched_at: "2024-01-01T00:00:00Z",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  },
];

describe("Recommendations API - GET /api/recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return recommendations successfully", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockRecEngine.getRecommendationsForUser.mockImplementation(() =>
      Promise.resolve({
        recommendations: mockRecommendations,
        algorithm: "hybrid",
        generatedAt: "2024-03-15T00:00:00Z",
      })
    );

    const request = new NextRequest("http://localhost:3000/api/recommendations");
    const response = await GET(request);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data?.recommendations).toHaveLength(1);
    expect(data.data?.algorithm).toBe("hybrid");
    expect(mockRecEngine.getRecommendationsForUser).toHaveBeenCalledWith(
      mockUser.id,
      expect.objectContaining({
        limit: 20,
        algorithm: "hybrid",
        forceRefresh: false,
      })
    );
  });

  it("should return personalized feed when feed=true", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockRecEngine.getPersonalizedFeed.mockImplementation(() =>
      Promise.resolve({
        recommended: mockRecommendations,
        new: [],
        algorithm: "hybrid",
      })
    );

    const request = new NextRequest("http://localhost:3000/api/recommendations?feed=true");
    const response = await GET(request);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data?.recommended).toBeDefined();
    expect(data.data?.new).toBeDefined();
    expect(mockRecEngine.getPersonalizedFeed).toHaveBeenCalledWith(
      mockUser.id,
      expect.objectContaining({
        limit: 20,
      })
    );
  });

  it("should respect limit parameter", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockRecEngine.getRecommendationsForUser.mockImplementation(() =>
      Promise.resolve({
        recommendations: mockRecommendations,
        algorithm: "hybrid",
        generatedAt: "2024-03-15T00:00:00Z",
      })
    );

    const request = new NextRequest("http://localhost:3000/api/recommendations?limit=10");
    const response = await GET(request);

    expect(response.ok).toBe(true);
    expect(mockRecEngine.getRecommendationsForUser).toHaveBeenCalledWith(
      mockUser.id,
      expect.objectContaining({
        limit: 10,
      })
    );
  });

  it("should respect algorithm parameter", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockRecEngine.getRecommendationsForUser.mockImplementation(() =>
      Promise.resolve({
        recommendations: mockRecommendations,
        algorithm: "content-based",
        generatedAt: "2024-03-15T00:00:00Z",
      })
    );

    const request = new NextRequest(
      "http://localhost:3000/api/recommendations?algorithm=content-based"
    );
    const response = await GET(request);

    expect(response.ok).toBe(true);
    expect(mockRecEngine.getRecommendationsForUser).toHaveBeenCalledWith(
      mockUser.id,
      expect.objectContaining({
        algorithm: "content-based",
      })
    );
  });

  it("should force refresh when refresh=true", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockRecEngine.getRecommendationsForUser.mockImplementation(() =>
      Promise.resolve({
        recommendations: mockRecommendations,
        algorithm: "hybrid",
        generatedAt: "2024-03-15T00:00:00Z",
      })
    );

    const request = new NextRequest("http://localhost:3000/api/recommendations?refresh=true");
    const response = await GET(request);

    expect(response.ok).toBe(true);
    expect(mockRecEngine.getRecommendationsForUser).toHaveBeenCalledWith(
      mockUser.id,
      expect.objectContaining({
        forceRefresh: true,
      })
    );
  });

  it("should require authentication", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));

    const request = new NextRequest("http://localhost:3000/api/recommendations");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("should handle errors gracefully", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockRecEngine.getRecommendationsForUser.mockImplementation(() =>
      Promise.reject(new Error("Database error"))
    );

    const request = new NextRequest("http://localhost:3000/api/recommendations");
    const response = await GET(request);

    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("Database error");
    expect(response.status).toBe(500);
  });
});

describe("Recommendations API - DELETE /api/recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should clear recommendations successfully", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockRecEngine.clearUserRecommendations.mockImplementation(() =>
      Promise.resolve({ success: true })
    );

    const request = new NextRequest("http://localhost:3000/api/recommendations", {
      method: "DELETE",
    });
    const response = await DELETE(request);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data?.message).toBe("Recommendations cleared");
    expect(mockRecEngine.clearUserRecommendations).toHaveBeenCalledWith(
      mockUser.id
    );
  });

  it("should require authentication", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));

    const request = new NextRequest("http://localhost:3000/api/recommendations", {
      method: "DELETE",
    });
    const response = await DELETE(request);

    expect(response.status).toBe(401);
  });

  it("should handle errors from clearUserRecommendations", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockRecEngine.clearUserRecommendations.mockImplementation(() =>
      Promise.resolve({ success: false, error: "Failed to clear" })
    );

    const request = new NextRequest("http://localhost:3000/api/recommendations", {
      method: "DELETE",
    });
    const response = await DELETE(request);

    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to clear");
    expect(response.status).toBe(500);
  });
});

describe("Recommendations API - PUT /api/recommendations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should record feedback successfully", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockRecEngine.recordRecommendationFeedback.mockImplementation(
      () => Promise.resolve()
    );

    const request = new NextRequest("http://localhost:3000/api/recommendations", {
      method: "PUT",
      body: JSON.stringify({
        eventId: "event-123",
        feedback: "helpful",
      }),
    });
    const response = await PUT(request);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data?.message).toBe("Feedback recorded");
    expect(mockRecEngine.recordRecommendationFeedback).toHaveBeenCalledWith(
      mockUser.id,
      "event-123",
      "helpful"
    );
  });

  it("should accept all valid feedback values", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockRecEngine.recordRecommendationFeedback.mockImplementation(
      () => Promise.resolve()
    );

    const validFeedback = ["helpful", "not_helpful", "dismissed"];

    for (const feedback of validFeedback) {
      const request = new NextRequest("http://localhost:3000/api/recommendations", {
        method: "PUT",
        body: JSON.stringify({
          eventId: "event-123",
          feedback,
        }),
      });
      const response = await PUT(request);

      expect(response.ok).toBe(true);
    }
  });

  it("should require authentication", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));

    const request = new NextRequest("http://localhost:3000/api/recommendations", {
      method: "PUT",
      body: JSON.stringify({
        eventId: "event-123",
        feedback: "helpful",
      }),
    });
    const response = await PUT(request);

    expect(response.status).toBe(401);
  });

  it("should validate eventId is present", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));

    const request = new NextRequest("http://localhost:3000/api/recommendations", {
      method: "PUT",
      body: JSON.stringify({
        feedback: "helpful",
      }),
    });
    const response = await PUT(request);

    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("eventId and feedback are required");
    expect(response.status).toBe(400);
  });

  it("should validate feedback is present", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));

    const request = new NextRequest("http://localhost:3000/api/recommendations", {
      method: "PUT",
      body: JSON.stringify({
        eventId: "event-123",
      }),
    });
    const response = await PUT(request);

    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("eventId and feedback are required");
    expect(response.status).toBe(400);
  });

  it("should validate feedback value", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));

    const request = new NextRequest("http://localhost:3000/api/recommendations", {
      method: "PUT",
      body: JSON.stringify({
        eventId: "event-123",
        feedback: "invalid",
      }),
    });
    const response = await PUT(request);

    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid feedback value");
    expect(response.status).toBe(400);
  });
});
