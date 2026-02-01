/**
 * Events API Routes Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { NextRequest } from "next/server";
import { GET } from "../../app/api/events/route";
import { GET as IdGET, POST, PUT, DELETE as IdDELETE } from "../../app/api/events/[id]/route";
import { GET as PrefGET, PUT as PrefPUT, DELETE as PrefDELETE } from "../../app/api/user/preferences/route";
import { POST as IntPOST, DELETE as IntDELETE } from "../../app/api/user/interests/route";
import * as auth from "../../lib/auth/server-client";
import * as dbQueries from "../../lib/db/queries";
import * as preferenceService from "../../lib/services/UserPreferencesService";
import type { DbEvent, DbUserPreference } from "../../lib/db/schema";

// Mock dependencies
jest.mock("../../lib/auth/server-client");
jest.mock("../../lib/db/queries");
jest.mock("../../lib/services/UserPreferencesService");

// Mock event data
const mockEvent: DbEvent = {
  id: "event-123",
  source_id: "source-123",
  external_id: "evt-123",
  title: "Tech Meetup Dubai",
  description: "A meetup for tech enthusiasts",
  event_url: "https://example.com/event",
  image_url: "https://example.com/image.jpg",
  start_time: "2024-03-15T18:00:00Z",
  end_time: "2024-03-15T20:00:00Z",
  location_name: "Dubai Tech Hub",
  location_lat: 25.2048,
  location_lng: 55.2708,
  is_virtual: false,
  category: "Technology",
  tags: ["technology", "networking"],
  raw_data: null,
  embedding: null,
  fetched_at: "2024-01-01T00:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockUser = {
  id: "user-123",
  email: "user@example.com",
  emailVerified: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockPreferences: DbUserPreference = {
  id: "pref-123",
  user_id: mockUser.id,
  interests: ["technology", "networking"],
  location_lat: 25.2048,
  location_lng: 55.2708,
  location_radius_km: 25,
  preferred_days: ["monday", "wednesday"],
  preferred_times: ["evening"],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

// Helper to cast jest mocks
const mockAuth = auth as unknown as { getServerUser: jest.Mock };
const mockDb = dbQueries as unknown as {
  getEvents: jest.Mock;
  getEventsBySource: jest.Mock;
  searchEvents: jest.Mock;
  getEventsByLocation: jest.Mock;
  getEventById: jest.Mock;
};
const mockPrefs = preferenceService as unknown as {
  isEventBookmarked: jest.Mock;
  isEventHidden: jest.Mock;
  recordInteraction: jest.Mock;
  toggleBookmark: jest.Mock;
  getUserPreferences: jest.Mock;
  setLocationPreference: jest.Mock;
  addInterest: jest.Mock;
  removeInterest: jest.Mock;
};

describe("Events API - GET /api/events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return events successfully", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));
    mockDb.getEvents.mockImplementation(() => Promise.resolve([mockEvent]));
    mockPrefs.isEventBookmarked.mockImplementation(() => Promise.resolve(false));
    mockPrefs.isEventHidden.mockImplementation(() => Promise.resolve(false));

    const request = new NextRequest("http://localhost:3000/api/events");
    const response = await GET(request);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data?.events).toHaveLength(1);
  });

  it("should filter by sources", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));
    mockDb.getEvents.mockImplementation(() => Promise.resolve([mockEvent]));
    mockDb.getEventsBySource.mockImplementation(() => Promise.resolve([mockEvent]));
    mockPrefs.isEventBookmarked.mockImplementation(() => Promise.resolve(false));
    mockPrefs.isEventHidden.mockImplementation(() => Promise.resolve(false));

    const request = new NextRequest(
      "http://localhost:3000/api/events?sources=eventbrite,meetup"
    );
    const response = await GET(request);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockDb.getEventsBySource).toHaveBeenCalledWith("eventbrite");
    expect(mockDb.getEventsBySource).toHaveBeenCalledWith("meetup");
  });

  it("should paginate results", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));
    const events = Array.from({ length: 25 }, (_, i) => ({
      ...mockEvent,
      id: `event-${i}`,
    }));
    mockDb.getEvents.mockImplementation(() => Promise.resolve(events));
    mockPrefs.isEventBookmarked.mockImplementation(() => Promise.resolve(false));
    mockPrefs.isEventHidden.mockImplementation(() => Promise.resolve(false));

    const request = new NextRequest("http://localhost:3000/api/events?page=1&per_page=10");
    const response = await GET(request);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data?.events).toHaveLength(10);
    expect(data.data?.total).toBe(25);
    expect(data.data?.has_more).toBe(true);
  });

  it("should search by query", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));
    mockDb.searchEvents.mockImplementation(() => Promise.resolve([mockEvent]));
    mockPrefs.isEventBookmarked.mockImplementation(() => Promise.resolve(false));
    mockPrefs.isEventHidden.mockImplementation(() => Promise.resolve(false));

    const request = new NextRequest("http://localhost:3000/api/events?q=technology");
    const response = await GET(request);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockDb.searchEvents).toHaveBeenCalledWith("technology");
  });

  it("should filter by location", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));
    mockDb.getEvents.mockImplementation(() => Promise.resolve([mockEvent]));
    mockDb.getEventsByLocation.mockImplementation(() => Promise.resolve([mockEvent]));
    mockPrefs.isEventBookmarked.mockImplementation(() => Promise.resolve(false));
    mockPrefs.isEventHidden.mockImplementation(() => Promise.resolve(false));

    const request = new NextRequest(
      "http://localhost:3000/api/events?lat=25.2048&lng=55.2708&radius_km=10"
    );
    const response = await GET(request);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockDb.getEventsByLocation).toHaveBeenCalledWith(
      25.2048,
      55.2708,
      10
    );
  });

  it("should filter by interests", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));
    mockDb.getEvents.mockImplementation(() => Promise.resolve([mockEvent]));
    mockPrefs.isEventBookmarked.mockImplementation(() => Promise.resolve(false));
    mockPrefs.isEventHidden.mockImplementation(() => Promise.resolve(false));

    const request = new NextRequest(
      "http://localhost:3000/api/events?interests=technology,networking"
    );
    const response = await GET(request);

    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it("should return error on database error", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));
    mockDb.getEvents.mockImplementation(() => Promise.reject(new Error("Database error")));

    const request = new NextRequest("http://localhost:3000/api/events");
    const response = await GET(request);

    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe("Database error");
    expect(response.status).toBe(500);
  });
});

describe("Event Detail API - GET /api/events/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return event details", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockDb.getEventById.mockImplementation(() => Promise.resolve(mockEvent));
    mockPrefs.isEventBookmarked.mockImplementation(() => Promise.resolve(false));
    mockPrefs.isEventHidden.mockImplementation(() => Promise.resolve(false));
    mockPrefs.recordInteraction.mockImplementation(() => Promise.resolve({
      id: "interaction-123",
      user_id: mockUser.id,
      event_id: mockEvent.id,
      interaction_type: "view",
      metadata: null,
      created_at: "2024-01-01T00:00:00Z",
    }));

    const request = new NextRequest(`http://localhost:3000/api/events/${mockEvent.id}`);
    const response = await IdGET(request, {
      params: { id: mockEvent.id },
    } as any);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data?.id).toBe(mockEvent.id);
  });

  it("should return 404 for non-existent event", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockDb.getEventById.mockImplementation(() => Promise.resolve(null));

    const request = new NextRequest("http://localhost:3000/api/events/nonexistent");
    const response = await IdGET(request, {
      params: { id: "nonexistent" },
    } as any);

    expect(response.status).toBe(404);
  });

  it("should record view interaction for authenticated users", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockDb.getEventById.mockImplementation(() => Promise.resolve(mockEvent));
    mockPrefs.isEventBookmarked.mockImplementation(() => Promise.resolve(false));
    mockPrefs.isEventHidden.mockImplementation(() => Promise.resolve(false));
    mockPrefs.recordInteraction.mockImplementation(() => Promise.resolve({
      id: "interaction-123",
      user_id: mockUser.id,
      event_id: mockEvent.id,
      interaction_type: "view",
      metadata: null,
      created_at: "2024-01-01T00:00:00Z",
    }));

    const request = new NextRequest(`http://localhost:3000/api/events/${mockEvent.id}`);
    await IdGET(request, {
      params: { id: mockEvent.id },
    } as any);

    expect(mockPrefs.recordInteraction).toHaveBeenCalledWith(
      mockUser.id,
      mockEvent.id,
      "view"
    );
  });
});

describe("Event Interaction API - POST /api/events/:id/interactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should record interaction", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockDb.getEventById.mockImplementation(() => Promise.resolve(mockEvent));
    mockPrefs.recordInteraction.mockImplementation(() => Promise.resolve({
      id: "interaction-123",
      user_id: mockUser.id,
      event_id: mockEvent.id,
      interaction_type: "click",
      metadata: { source: "feed" },
      created_at: "2024-01-01T00:00:00Z",
    } as any));

    const request = new NextRequest(`http://localhost:3000/api/events/${mockEvent.id}/interactions`, {
      method: "POST",
      body: JSON.stringify({
        interaction_type: "click",
        metadata: { source: "feed" },
      }),
    });

    const response = await POST(request, {
      params: { id: mockEvent.id },
    } as any);

    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it("should require authentication", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));

    const request = new NextRequest(`http://localhost:3000/api/events/${mockEvent.id}/interactions`, {
      method: "POST",
      body: JSON.stringify({
        interaction_type: "click",
      }),
    });

    const response = await POST(request, {
      params: { id: mockEvent.id },
    } as any);

    expect(response.status).toBe(401);
  });

  it("should validate interaction type", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockDb.getEventById.mockImplementation(() => Promise.resolve(mockEvent));

    const request = new NextRequest(`http://localhost:3000/api/events/${mockEvent.id}/interactions`, {
      method: "POST",
      body: JSON.stringify({
        interaction_type: "invalid",
      }),
    });

    const response = await POST(request, {
      params: { id: mockEvent.id },
    } as any);

    expect(response.status).toBe(400);
  });
});

describe("Bookmark API - PUT /api/events/:id/bookmark", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should toggle bookmark", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockDb.getEventById.mockImplementation(() => Promise.resolve(mockEvent));
    mockPrefs.toggleBookmark.mockImplementation(() => Promise.resolve({
      bookmarked: true,
      interaction: {
        id: "interaction-123",
        user_id: mockUser.id,
        event_id: mockEvent.id,
        interaction_type: "bookmark",
        metadata: null,
        created_at: "2024-01-01T00:00:00Z",
      },
    }));

    const request = new NextRequest(`http://localhost:3000/api/events/${mockEvent.id}/bookmark`, {
      method: "PUT",
    });

    const response = await PUT(request, {
      params: { id: mockEvent.id },
    } as any);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data?.bookmarked).toBe(true);
  });

  it("should require authentication", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));

    const request = new NextRequest(`http://localhost:3000/api/events/${mockEvent.id}/bookmark`, {
      method: "PUT",
    });

    const response = await PUT(request, {
      params: { id: mockEvent.id },
    } as any);

    expect(response.status).toBe(401);
  });
});

describe("User Preferences API - GET /api/user/preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return user preferences", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockPrefs.getUserPreferences.mockImplementation(() => Promise.resolve(mockPreferences));

    const request = new NextRequest("http://localhost:3000/api/user/preferences");
    const response = await PrefGET(request);

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data?.id).toBe(mockPreferences.id);
  });

  it("should require authentication", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(null));

    const request = new NextRequest("http://localhost:3000/api/user/preferences");
    const response = await PrefGET(request);

    expect(response.status).toBe(401);
  });
});

describe("User Preferences API - PUT /api/user/preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update user preferences", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockPrefs.getUserPreferences.mockImplementation(() => Promise.resolve(mockPreferences));
    mockPrefs.setLocationPreference.mockImplementation(() => Promise.resolve(mockPreferences));

    const request = new NextRequest("http://localhost:3000/api/user/preferences", {
      method: "PUT",
      body: JSON.stringify({
        location: {
          lat: 25.0805,
          lng: 55.1402,
          radiusKm: 30,
        },
      }),
    });

    const response = await PrefPUT(request);

    const data = await response.json();

    expect(data.success).toBe(true);
  });
});

describe("User Interests API - POST /api/user/interests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should add interest", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockPrefs.addInterest.mockImplementation(() => Promise.resolve(mockPreferences));

    const request = new NextRequest("http://localhost:3000/api/user/interests", {
      method: "POST",
      body: JSON.stringify({ interest: "blockchain" }),
    });

    const response = await IntPOST(request);

    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it("should require interest in request body", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));

    const request = new NextRequest("http://localhost:3000/api/user/interests", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await IntPOST(request);

    expect(response.status).toBe(400);
  });
});

describe("User Interests API - DELETE /api/user/interests/:interest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should remove interest", async () => {
    mockAuth.getServerUser.mockImplementation(() => Promise.resolve(mockUser));
    mockPrefs.removeInterest.mockImplementation(() => Promise.resolve(mockPreferences));

    const request = new NextRequest(
      "http://localhost:3000/api/user/interests/technology",
      {
        method: "DELETE",
      }
    );

    const response = await IntDELETE(request, {
      params: { interest: "technology" },
    } as any);

    const data = await response.json();

    expect(data.success).toBe(true);
  });
});
