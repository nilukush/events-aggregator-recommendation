/**
 * Converters between NormalizedEvent and DbEvent formats
 */

import type {
  NormalizedEvent,
  EventSourceType,
} from "../../types/index";
import type {
  DbEvent,
  DbEventInsert,
} from "./schema";

/**
 * Convert a NormalizedEvent to DbEventInsert format
 * This is used when inserting events into the database
 */
export function normalizedEventToDbInsert(
  event: NormalizedEvent,
  sourceId: string,
  embedding?: number[]
): DbEventInsert {
  return {
    source_id: sourceId,
    external_id: event.externalId,
    title: event.title,
    description: event.description,
    event_url: event.url,
    image_url: event.imageUrl,
    start_time: event.startTime.toISOString(),
    end_time: event.endTime?.toISOString() || null,
    location_name: event.location.name || null,
    location_lat: event.location.lat || null,
    location_lng: event.location.lng || null,
    is_virtual: event.location.isVirtual,
    category: event.category,
    tags: event.tags,
    raw_data: event.rawData as Record<string, unknown> | null,
    embedding: embedding || null,
  };
}

/**
 * Convert a DbEvent to NormalizedEvent format
 * This is used when returning events from the database
 */
export function dbEventToNormalized(
  dbEvent: DbEvent,
  sourceSlug: EventSourceType
): NormalizedEvent {
  return {
    id: dbEvent.id,
    source: sourceSlug,
    externalId: dbEvent.external_id,
    title: dbEvent.title,
    description: dbEvent.description,
    url: dbEvent.event_url,
    imageUrl: dbEvent.image_url,
    startTime: new Date(dbEvent.start_time),
    endTime: dbEvent.end_time ? new Date(dbEvent.end_time) : null,
    location: {
      name: dbEvent.location_name || undefined,
      lat: dbEvent.location_lat || undefined,
      lng: dbEvent.location_lng || undefined,
      isVirtual: dbEvent.is_virtual,
    },
    category: dbEvent.category,
    tags: dbEvent.tags || [],
    rawData: dbEvent.raw_data,
  };
}

/**
 * Batch convert NormalizedEvent[] to DbEventInsert[]
 */
export function normalizedEventsToDbInserts(
  events: NormalizedEvent[],
  sourceId: string,
  embeddings?: number[][]
): DbEventInsert[] {
  return events.map((event, index) =>
    normalizedEventToDbInsert(
      event,
      sourceId,
      embeddings?.[index]
    )
  );
}

/**
 * Batch convert DbEvent[] to NormalizedEvent[]
 */
export function dbEventsToNormalized(
  dbEvents: DbEvent[],
  sourceMap: Map<string, EventSourceType>
): NormalizedEvent[] {
  return dbEvents.map((dbEvent) => {
    const sourceSlug = sourceMap.get(dbEvent.source_id) || "other";
    return dbEventToNormalized(dbEvent, sourceSlug);
  });
}
