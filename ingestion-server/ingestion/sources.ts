import ical from "node-ical";
import RSSParser from "rss-parser";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type {
  EventSourceConfig,
  IcsSourceConfig,
  JsonSourceConfig,
  NormalizedEvent,
  RssSourceConfig,
} from "./types";
import { DUMMY_VENUES } from "./dummyData";

const rssParser = new RSSParser();
const geocodeCache = new Map<string, GeocodeResult | null>();

const PLACEHOLDER_LOCATION_VALUE = "sign in to download the location";
const RANDOM_FALLBACK_LOCATIONS = [
  "Memorial Union, 301 E Orange St, Tempe, AZ 85281, United States",
  "Sun Devil Stadium, 500 E Veterans Way, Tempe, AZ 85287, United States",
  "Hayden Library, 300 E Orange St, Tempe, AZ 85281, United States",
  "Student Pavilion, 400 E Orange St, Tempe, AZ 85281, United States",
  "Creative Commons, 501 E Orange St, Tempe, AZ 85281, United States",
  "Durham Hall, 851 S Cady Mall, Tempe, AZ 85281, United States",
  "Byron Mall, Tempe, AZ 85281, United States",
  "Desert Financial Arena, 600 E Veterans Way, Tempe, AZ 85281, United States",
  "Engineering Center Wing G, 501 E Tyler Mall, Tempe, AZ 85281, United States",
  "Biodesign Institute, 727 E Tyler St, Tempe, AZ 85281, United States",
];

type GeocodeResult = {
  lat: number;
  lon: number;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
};

async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key) ?? null;
  }

  const dummyVenue = selectDummyVenueForKey(key);
  if (!dummyVenue) {
    geocodeCache.set(key, null);
    return null;
  }

  const result: GeocodeResult = {
    lat: dummyVenue.lat,
    lon: dummyVenue.lon,
    street: dummyVenue.street_address,
    city: dummyVenue.city,
    state: dummyVenue.state,
    postal_code: dummyVenue.postal_code,
  };
  geocodeCache.set(key, result);
  return result;
}
const jsonSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    start_at: z.string(),
    end_at: z.string().optional().nullable(),
    categories: z.array(z.string()).optional().default([]),
    organizer: z.string().optional().nullable(),
    venue: z.string().optional().nullable(),
    status: z
      .enum(["scheduled", "cancelled", "postponed"])
      .optional()
      .nullable(),
  }),
);

export async function collectSourceEvents(
  config: EventSourceConfig,
): Promise<NormalizedEvent[]> {
  if (!config.enabled && config.enabled !== undefined) {
    return [];
  }

  switch (config.type) {
    case "ics":
      return collectIcsEvents(config);
    case "rss":
      return collectRssEvents(config);
    case "json":
      return collectJsonEvents(config);
    default:
      return [];
  }
}

function mergeCategories(
  values: Array<string | undefined | null>,
  tags?: string[],
) {
  const merged = new Set<string>();
  [...values, ...(tags ?? [])].forEach((cat) => {
    if (!cat) return;
    const normalized = cat.trim().toLowerCase();
    if (normalized) merged.add(normalized);
  });
  return Array.from(merged);
}

function parseDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function ensureEnd(start: Date, end: Date | null, fallbackMinutes?: number) {
  if (end) return end;
  const durationMs = (fallbackMinutes ?? 60) * 60 * 1000;
  return new Date(start.getTime() + durationMs);
}

function isHttp(url: string) {
  return /^https?:\/\//i.test(url);
}

function isFile(url: string) {
  return url.startsWith("file://");
}

function resolveLocalPath(ref: string) {
  if (isFile(ref)) {
    return fileURLToPath(ref);
  }
  if (path.isAbsolute(ref)) {
    return ref;
  }
  return path.join(process.cwd(), ref);
}

async function readLocal(ref: string) {
  const absolute = resolveLocalPath(ref);
  return readFile(absolute, "utf8");
}

async function collectIcsEvents(
  config: IcsSourceConfig,
): Promise<NormalizedEvent[]> {
  const calendar = await loadIcsRecords(config.url);
  const components = Object.values(calendar).filter(
    (component): component is ical.VEvent => component.type === "VEVENT",
  );

  const events = await Promise.all(
    components.map(async (component): Promise<NormalizedEvent | null> => {
      const summary = extractText(component.summary);
      if (!summary) return null;
      const title = summary.trim();
      if (!title) return null;

      const start = parseDate(component.start);
      if (!start) return null;
      const end = ensureEnd(
        start,
        parseDate(component.end),
        config.defaultDurationMinutes,
      );
      const externalId = component.uid ?? `${title}-${start.toISOString()}`;
      const organizer = extractOrganizer(component.organizer);
      const categories = buildCategoriesFromComponent(component);
      const description = extractText(component.description);
      const locationText = resolveLocationText(
        extractText(component.location),
        config.defaultVenueName ?? null,
      );
      const geocode = locationText ? await geocodeAddress(locationText) : null;

      return {
        sourceKey: config.key,
        externalId,
        title,
        description: description ?? null,
        start,
        end,
        categories: mergeCategories(categories, config.tags),
        organizer,
        venue: locationText,
        venueLat: geocode?.lat ?? null,
        venueLon: geocode?.lon ?? null,
        venueStreet: geocode?.street ?? null,
        venueCity: geocode?.city ?? null,
        venueState: geocode?.state ?? null,
        venuePostalCode: geocode?.postal_code ?? null,
        status: mapIcsStatus(component.status) ?? config.defaultStatus,
      };
    }),
  );

  return events.filter((event): event is NormalizedEvent => event !== null);
}

async function loadIcsRecords(url: string) {
  if (isHttp(url)) {
    return ical.async.fromURL(url);
  }
  const absolute = resolveLocalPath(url);
  return ical.async.parseFile(absolute);
}

function extractOrganizer(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    "val" in value &&
    typeof (value as { val: unknown }).val === "string"
  ) {
    return (value as { val: string }).val;
  }
  if (
    typeof value === "object" &&
    "params" in value &&
    value?.params &&
    typeof (value as { params: Record<string, unknown> }).params.CN === "string"
  ) {
    return (
      ((value as { params: Record<string, unknown> }).params.CN as string) ??
      null
    );
  }
  return null;
}

function extractText(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    "val" in value &&
    typeof (value as { val: unknown }).val === "string"
  ) {
    return (value as { val: string }).val;
  }
  return null;
}

function getRandomFallbackLocation() {
  if (RANDOM_FALLBACK_LOCATIONS.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * RANDOM_FALLBACK_LOCATIONS.length);
  return RANDOM_FALLBACK_LOCATIONS[index];
}

function selectDummyVenueForKey(key: string) {
  if (!DUMMY_VENUES.length) {
    return null;
  }
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const index = hash % DUMMY_VENUES.length;
  return DUMMY_VENUES[index] ?? null;
}

function resolveLocationText(
  rawLocation?: string | null,
  fallback?: string | null,
) {
  if (!rawLocation) {
    return fallback ?? null;
  }
  const trimmed = rawLocation.trim();
  if (!trimmed) {
    return fallback ?? null;
  }
  if (trimmed.toLowerCase() === PLACEHOLDER_LOCATION_VALUE) {
    return getRandomFallbackLocation() ?? fallback ?? null;
  }
  return trimmed;
}

async function collectRssEvents(
  config: RssSourceConfig,
): Promise<NormalizedEvent[]> {
  const feed = await loadRss(config.url);
  const defaultDuration = config.defaultDurationMinutes ?? 120;

  const events: NormalizedEvent[] = [];

  (feed.items ?? []).forEach((item) => {
    if (!item.title) return;
    const start = parseDate(item.isoDate ?? item.pubDate ?? null);
    if (!start) return;
    const end = ensureEnd(start, null, defaultDuration);
    const externalId =
      item.guid ?? item.link ?? `${item.title}-${start.toISOString()}`;
    const categories = Array.isArray(item.categories) ? item.categories : [];
    const description =
      item.contentSnippet ??
      item.content ??
      item.summary ??
      item.description ??
      null;

    events.push({
      sourceKey: config.key,
      externalId,
      title: item.title.trim(),
      description,
      start,
      end,
      categories: mergeCategories(categories, config.tags),
      organizer: config.defaultOrganizerName ?? null,
      venue: config.defaultVenueName ?? null,
      status: config.defaultStatus,
    });
  });

  return events;
}

async function loadRss(url: string) {
  if (isHttp(url)) {
    return rssParser.parseURL(url);
  }
  const xml = await readLocal(url);
  return rssParser.parseString(xml);
}

async function collectJsonEvents(
  config: JsonSourceConfig,
): Promise<NormalizedEvent[]> {
  const payload = await loadJson(config.url);

  const events: NormalizedEvent[] = [];

  payload.forEach((item) => {
    const start = parseDate(item.start_at);
    if (!start) return;
    const end = parseDate(item.end_at) ?? ensureEnd(start, null, 90);

    events.push({
      sourceKey: config.key,
      externalId: item.id,
      title: item.title.trim(),
      description: item.description ?? null,
      start,
      end,
      categories: mergeCategories(item.categories ?? [], config.tags),
      organizer: item.organizer ?? config.defaultOrganizerName ?? null,
      venue: item.venue ?? config.defaultVenueName ?? null,
      status:
        (item.status as NormalizedEvent["status"]) ?? config.defaultStatus,
    });
  });

  return events;
}

async function loadJson(url: string) {
  if (isHttp(url)) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON source (${response.status})`);
    }
    const json = await response.json();
    return jsonSchema.parse(json);
  }
  const raw = await readLocal(url);
  const parsed = JSON.parse(raw);
  return jsonSchema.parse(parsed);
}

function mapIcsStatus(status?: string | null) {
  if (!status) return undefined;
  const normalized = status.toLowerCase();
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "tentative") return "postponed";
  return "scheduled";
}

function buildCategoriesFromComponent(component: Record<string, unknown>) {
  const categories: string[] = [];
  const raw = (component as { categories?: unknown }).categories;
  if (Array.isArray(raw)) {
    raw.forEach((entry) => {
      if (!entry) return;
      if (typeof entry === "string") {
        pushCategory(categories, entry);
        return;
      }
      if (
        typeof entry === "object" &&
        entry !== null &&
        "val" in entry &&
        typeof (entry as { val?: unknown }).val === "string"
      ) {
        pushCategory(categories, (entry as { val: string }).val);
        return;
      }
      if (
        typeof entry === "object" &&
        entry !== null &&
        "params" in entry &&
        (entry as { params?: Record<string, unknown> }).params
      ) {
        const params = (entry as { params: Record<string, unknown> }).params;
        Object.values(params).forEach((value) => {
          if (typeof value === "string") {
            pushCategory(categories, value);
          } else if (Array.isArray(value)) {
            value
              .map((item) => (typeof item === "string" ? item : String(item)))
              .forEach((item) => pushCategory(categories, item));
          }
        });
      }
    });
  }
  return categories;
}

function pushCategory(bucket: string[], value: string) {
  const token = normalizeCategoryToken(value);
  if (token) bucket.push(token);
}

function normalizeCategoryToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parts = trimmed
    .split(":")
    .map((part) => part.trim())
    .filter(Boolean);
  const token = parts.length ? parts[parts.length - 1] : trimmed;
  return token.replace(/[_\s]+/g, " ");
}
