import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { EventRow } from "../../src/lib/types";
import { collectSourceEvents } from "./sources";
import type { EventSourceConfig, NormalizedEvent } from "./types";
import {
  DUMMY_ORGANIZERS,
  DUMMY_VENUES,
  pickRandomCategories,
  pickRandomOrganizerId,
  pickRandomStatus,
  pickRandomVenueId,
} from "./dummyData";

export const DEFAULT_LOOKBACK_DAYS = 30;

export type PendingInsert = {
  normalized: NormalizedEvent;
  config: EventSourceConfig;
  payload: InsertEventPayload;
  categories: string[];
};

export type PrepareIngestionResult = {
  pending: PendingInsert[];
  normalizedCount: number;
  dedupedCount: number;
};

export type InsertResult = {
  eventsInserted: number;
  categoriesInserted: number;
};

type InsertEventPayload = {
  organizer_id: number | null;
  venue_id: number | null;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  status: EventRow["status"];
};

type LookupMaps = {
  organizerMap: Map<string, number>;
  venueMap: Map<string, number>;
  dummyVenueIds: number[];
  dummyOrganizerIds: number[];
};

type PrepareParams = {
  supabase: SupabaseClient;
  sourceConfigs: EventSourceConfig[];
  lookbackDays?: number;
};

export async function prepareIngestionRun({
  supabase,
  sourceConfigs,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
}: PrepareParams): Promise<PrepareIngestionResult> {
  if (!sourceConfigs.length) {
    return { pending: [], normalizedCount: 0, dedupedCount: 0 };
  }

  const configByKey = new Map(sourceConfigs.map((cfg) => [cfg.key, cfg]));
  const normalizedEvents = await fetchAllSources(sourceConfigs);

  if (!normalizedEvents.length) {
    return { pending: [], normalizedCount: 0, dedupedCount: 0 };
  }

  const existingFingerprints = await loadExistingFingerprints(
    supabase,
    lookbackDays,
  );
  const deduped = dedupeEvents(normalizedEvents, existingFingerprints);

  if (!deduped.length) {
    return {
      pending: [],
      normalizedCount: normalizedEvents.length,
      dedupedCount: 0,
    };
  }

  const lookups = await loadLookups(supabase);
  await ensureGeocodedVenuesForEvents(supabase, deduped, lookups.venueMap);
  const pending = buildPendingInsertList(deduped, configByKey, lookups);

  return {
    pending,
    normalizedCount: normalizedEvents.length,
    dedupedCount: deduped.length,
  };
}

export async function insertPendingInserts(
  client: SupabaseClient,
  pending: PendingInsert[],
): Promise<InsertResult> {
  if (!pending.length) {
    return { eventsInserted: 0, categoriesInserted: 0 };
  }

  const { data, error } = await client
    .from("event")
    .insert(pending.map((item) => item.payload))
    .select("event_id");

  if (error) throw error;

  const inserted = data ?? [];
  const categoryRows: { event_id: number; category: string }[] = [];

  inserted.forEach((row, index) => {
    const categories = new Set(pending[index]?.categories ?? []);
    categories.forEach((category) => {
      categoryRows.push({ event_id: row.event_id, category });
    });
  });

  if (categoryRows.length) {
    const { error: catError } = await client
      .from("event_category")
      .insert(categoryRows);
    if (catError) throw catError;
  }

  return {
    eventsInserted: inserted.length,
    categoriesInserted: categoryRows.length,
  };
}

async function fetchAllSources(configs: EventSourceConfig[]) {
  const results = await Promise.all(
    configs.map(async (config) => {
      try {
        const events = await collectSourceEvents(config);
        console.log(`Fetched ${events.length} events from ${config.key}`);
        return events;
      } catch (error) {
        console.error(`Failed to collect ${config.key}:`, error);
        return [];
      }
    }),
  );

  return results.flat();
}

async function loadExistingFingerprints(
  client: SupabaseClient,
  lookbackDays: number,
) {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  const { data, error } = await client
    .from("event")
    .select("title, start_at")
    .gte("start_at", since.toISOString());

  if (error) throw error;

  const fingerprints = new Set<string>();
  (data ?? []).forEach((row) => {
    const iso = new Date(row.start_at).toISOString();
    fingerprints.add(makeFingerprint(row.title, iso));
  });
  return fingerprints;
}

function dedupeEvents(
  events: NormalizedEvent[],
  existingFingerprints: Set<string>,
) {
  const seen = new Set(existingFingerprints);
  const unique: NormalizedEvent[] = [];

  events.forEach((event) => {
    const iso = event.start.toISOString();
    const token = makeFingerprint(event.title, iso);
    if (seen.has(token)) return;
    seen.add(token);
    unique.push(event);
  });

  return unique;
}

function makeFingerprint(title: string, isoStart: string) {
  return `${title.trim().toLowerCase()}|${isoStart}`;
}

async function loadLookups(client: SupabaseClient): Promise<LookupMaps> {
  const [organizerRes, venueRes] = await Promise.all([
    client.from("organizer").select("organizer_id, org_name"),
    client.from("venue").select("venue_id, name"),
  ]);

  handlePostgrestError(organizerRes.error);
  handlePostgrestError(venueRes.error);

  const organizerMap = new Map<string, number>();
  (organizerRes.data ?? []).forEach((row) => {
    organizerMap.set(normalizeName(row.org_name), row.organizer_id);
  });

  const venueMap = new Map<string, number>();
  (venueRes.data ?? []).forEach((row) => {
    venueMap.set(normalizeName(row.name), row.venue_id);
  });

  const dummyOrganizerIds = await ensureDummyOrganizers(client, organizerMap);
  const dummyVenueIds = await ensureDummyVenues(client, venueMap);

  return { organizerMap, venueMap, dummyVenueIds, dummyOrganizerIds };
}

function handlePostgrestError(error: PostgrestError | null) {
  if (error) {
    throw error;
  }
}

function buildPendingInsertList(
  events: NormalizedEvent[],
  configByKey: Map<string, EventSourceConfig>,
  lookups: LookupMaps,
): PendingInsert[] {
  const pending: PendingInsert[] = [];

  events.forEach((event) => {
    const config = configByKey.get(event.sourceKey);
    if (!config) return;
    const payload = buildPayload(event, config, lookups);
    if (!payload) return;
    const categories = ensureCategories(event, config);
    pending.push({
      normalized: event,
      config,
      payload,
      categories,
    });
  });

  return pending;
}

function buildPayload(
  event: NormalizedEvent,
  config: EventSourceConfig,
  lookups: LookupMaps,
): InsertEventPayload | null {
  const title = event.title.trim();
  if (!title) return null;

  const startIso = event.start.toISOString();
  const endDate =
    event.end.getTime() > event.start.getTime()
      ? event.end
      : new Date(event.start.getTime() + 60 * 60 * 1000);
  const endIso = endDate.toISOString();

  const resolvedVenueId =
    resolveVenueId(event, config, lookups.venueMap) ??
    pickRandomVenueId(lookups.dummyVenueIds);
  if (!resolvedVenueId) {
    console.warn(
      "[ingest] Unable to resolve venue for event, skipping:",
      title,
    );
    return null;
  }

  const organizerId =
    resolveOrganizerId(event, config, lookups.organizerMap) ??
    pickRandomOrganizerId(lookups.dummyOrganizerIds);

  if (!organizerId) {
    console.warn(
      "[ingest] Unable to resolve organizer for event, skipping:",
      title,
    );
    return null;
  }

  return {
    organizer_id: organizerId,
    venue_id: resolvedVenueId,
    title,
    description: event.description?.trim() || null,
    start_at: startIso,
    end_at: endIso,
    status: event.status ?? config.defaultStatus ?? pickRandomStatus(),
  };
}

function resolveOrganizerId(
  event: NormalizedEvent,
  config: EventSourceConfig,
  organizerMap: Map<string, number>,
) {
  if (config.defaultOrganizerId) return config.defaultOrganizerId;
  const fromEvent = lookupId(event.organizer, organizerMap);
  if (fromEvent) return fromEvent;
  if (config.defaultOrganizerName) {
    const fallback = lookupId(config.defaultOrganizerName, organizerMap);
    if (fallback) return fallback;
  }
  return null;
}

function resolveVenueId(
  event: NormalizedEvent,
  config: EventSourceConfig,
  venueMap: Map<string, number>,
) {
  if (config.defaultVenueId) return config.defaultVenueId;
  const fromEvent = lookupId(event.venue, venueMap);
  if (fromEvent) return fromEvent;
  if (config.defaultVenueName) {
    const fallback = lookupId(config.defaultVenueName, venueMap);
    if (fallback) return fallback;
  }
  return null;
}

function lookupId(value: string | null | undefined, map: Map<string, number>) {
  const key = normalizeName(value ?? undefined);
  if (!key) return null;
  return map.get(key) ?? null;
}

function normalizeName(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

async function ensureDummyVenues(
  client: SupabaseClient,
  venueMap: Map<string, number>,
) {
  const missing = DUMMY_VENUES.filter(
    (venue) => !venueMap.has(normalizeName(venue.name)),
  );
  if (missing.length) {
    const { data, error } = await client
      .from("venue")
      .insert(missing)
      .select("venue_id, name");
    handlePostgrestError(error);
    (data ?? []).forEach((row) => {
      venueMap.set(normalizeName(row.name), row.venue_id);
    });
  }

  const dummyIds = DUMMY_VENUES.map((venue) =>
    venueMap.get(normalizeName(venue.name)),
  ).filter((val): val is number => typeof val === "number");

  return dummyIds;
}

async function ensureGeocodedVenuesForEvents(
  client: SupabaseClient,
  events: NormalizedEvent[],
  venueMap: Map<string, number>,
) {
  const pendingByKey = new Map<
    string,
    {
      name: string;
      street_address: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      lat: number;
      lon: number;
    }
  >();

  events.forEach((event) => {
    const key = normalizeName(event.venue ?? undefined);
    if (!key || venueMap.has(key)) return;
    if (
      typeof event.venueLat !== "number" ||
      typeof event.venueLon !== "number" ||
      Number.isNaN(event.venueLat) ||
      Number.isNaN(event.venueLon)
    ) {
      return;
    }

    if (!pendingByKey.has(key)) {
      pendingByKey.set(key, {
        name: event.venue ?? "Untitled Venue",
        street_address: event.venueStreet ?? null,
        city: event.venueCity ?? null,
        state: event.venueState ?? null,
        postal_code: event.venuePostalCode ?? null,
        lat: event.venueLat,
        lon: event.venueLon,
      });
    }
  });

  if (!pendingByKey.size) return;

  const { data, error } = await client
    .from("venue")
    .insert(Array.from(pendingByKey.values()))
    .select("venue_id, name");
  handlePostgrestError(error);
  (data ?? []).forEach((row) => {
    venueMap.set(normalizeName(row.name), row.venue_id);
  });
}

async function ensureDummyOrganizers(
  client: SupabaseClient,
  organizerMap: Map<string, number>,
) {
  const missing = DUMMY_ORGANIZERS.filter(
    (org) => !organizerMap.has(normalizeName(org.org_name)),
  );
  if (missing.length) {
    const { data, error } = await client
      .from("organizer")
      .insert(
        missing.map((org) => ({
          org_name: org.org_name,
          website_url: org.website_url ?? null,
        })),
      )
      .select("organizer_id, org_name");
    handlePostgrestError(error);
    (data ?? []).forEach((row) => {
      organizerMap.set(normalizeName(row.org_name), row.organizer_id);
    });
  }

  const dummyIds = DUMMY_ORGANIZERS.map((org) =>
    organizerMap.get(normalizeName(org.org_name)),
  ).filter((val): val is number => typeof val === "number");

  return dummyIds;
}

function ensureCategories(
  event: NormalizedEvent,
  config: EventSourceConfig,
): string[] {
  const normalized = new Set(
    (event.categories ?? []).map((category) => normalizeCategory(category)),
  );

  if (!normalized.size && config.tags?.length) {
    config.tags
      .map((tag) => normalizeCategory(tag))
      .filter(Boolean)
      .forEach((tag) => normalized.add(tag));
  }

  if (!normalized.size) {
    pickRandomCategories(2).forEach((category) => normalized.add(category));
  }

  return Array.from(normalized);
}

function normalizeCategory(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}
