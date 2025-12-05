import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { EventRow } from '../../src/lib/types';
import { collectSourceEvents } from './sources';
import type { EventSourceConfig, NormalizedEvent } from './types';

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
  status: EventRow['status'];
};

type LookupMaps = {
  organizerMap: Map<string, number>;
  venueMap: Map<string, number>;
};

type PrepareParams = {
  supabase: SupabaseClient;
  sourceConfigs: EventSourceConfig[];
  lookbackDays?: number;
};

export async function prepareIngestionRun({
  supabase,
  sourceConfigs,
  lookbackDays = DEFAULT_LOOKBACK_DAYS
}: PrepareParams): Promise<PrepareIngestionResult> {
  if (!sourceConfigs.length) {
    return { pending: [], normalizedCount: 0, dedupedCount: 0 };
  }

  const configByKey = new Map(sourceConfigs.map((cfg) => [cfg.key, cfg]));
  const normalizedEvents = await fetchAllSources(sourceConfigs);

  if (!normalizedEvents.length) {
    return { pending: [], normalizedCount: 0, dedupedCount: 0 };
  }

  const existingFingerprints = await loadExistingFingerprints(supabase, lookbackDays);
  const deduped = dedupeEvents(normalizedEvents, existingFingerprints);

  if (!deduped.length) {
    return {
      pending: [],
      normalizedCount: normalizedEvents.length,
      dedupedCount: 0
    };
  }

  const lookups = await loadLookups(supabase);
  const pending = buildPendingInsertList(deduped, configByKey, lookups);

  return {
    pending,
    normalizedCount: normalizedEvents.length,
    dedupedCount: deduped.length
  };
}

export async function insertPendingInserts(
  client: SupabaseClient,
  pending: PendingInsert[]
): Promise<InsertResult> {
  if (!pending.length) {
    return { eventsInserted: 0, categoriesInserted: 0 };
  }

  const { data, error } = await client
    .from('event')
    .insert(pending.map((item) => item.payload))
    .select('event_id');

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
    const { error: catError } = await client.from('event_category').insert(categoryRows);
    if (catError) throw catError;
  }

  return {
    eventsInserted: inserted.length,
    categoriesInserted: categoryRows.length
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
    })
  );

  return results.flat();
}

async function loadExistingFingerprints(client: SupabaseClient, lookbackDays: number) {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  const { data, error } = await client
    .from('event')
    .select('title, start_at')
    .gte('start_at', since.toISOString());

  if (error) throw error;

  const fingerprints = new Set<string>();
  (data ?? []).forEach((row) => {
    const iso = new Date(row.start_at).toISOString();
    fingerprints.add(makeFingerprint(row.title, iso));
  });
  return fingerprints;
}

function dedupeEvents(events: NormalizedEvent[], existingFingerprints: Set<string>) {
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
    client.from('organizer').select('organizer_id, org_name'),
    client.from('venue').select('venue_id, name')
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

  return { organizerMap, venueMap };
}

function handlePostgrestError(error: PostgrestError | null) {
  if (error) {
    throw error;
  }
}

function buildPendingInsertList(
  events: NormalizedEvent[],
  configByKey: Map<string, EventSourceConfig>,
  lookups: LookupMaps
): PendingInsert[] {
  const pending: PendingInsert[] = [];

  events.forEach((event) => {
    const config = configByKey.get(event.sourceKey);
    if (!config) return;
    const payload = buildPayload(event, config, lookups);
    if (!payload) return;
    pending.push({
      normalized: event,
      config,
      payload,
      categories: event.categories
    });
  });

  return pending;
}

function buildPayload(
  event: NormalizedEvent,
  config: EventSourceConfig,
  lookups: LookupMaps
): InsertEventPayload | null {
  const title = event.title.trim();
  if (!title) return null;

  const startIso = event.start.toISOString();
  const endDate = event.end.getTime() > event.start.getTime()
    ? event.end
    : new Date(event.start.getTime() + 60 * 60 * 1000);
  const endIso = endDate.toISOString();

  return {
    organizer_id: resolveOrganizerId(event, config, lookups.organizerMap),
    venue_id: resolveVenueId(event, config, lookups.venueMap),
    title,
    description: event.description?.trim() || null,
    start_at: startIso,
    end_at: endIso,
    status: event.status ?? config.defaultStatus ?? 'scheduled'
  };
}

function resolveOrganizerId(
  event: NormalizedEvent,
  config: EventSourceConfig,
  organizerMap: Map<string, number>
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
  venueMap: Map<string, number>
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
  return value?.trim().toLowerCase() ?? '';
}
