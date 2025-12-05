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

const rssParser = new RSSParser();
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
  })
);

export async function collectSourceEvents(
  config: EventSourceConfig
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
  tags?: string[]
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
  config: IcsSourceConfig
): Promise<NormalizedEvent[]> {
  const calendar = await loadIcsRecords(config.url);
  const events: NormalizedEvent[] = [];

  Object.values(calendar).forEach((component) => {
    if (component.type !== "VEVENT") return;

    const summary = extractText(component.summary);
    if (!summary) return;
    const title = summary.trim();
    if (!title) return;

    const start = parseDate(component.start);
    if (!start) return;
    const end = ensureEnd(
      start,
      parseDate(component.end),
      config.defaultDurationMinutes
    );
    const externalId = component.uid ?? `${title}-${start.toISOString()}`;
    const organizer = extractOrganizer(component.organizer);
    const categories = toArray(
      (component as unknown as { categories?: unknown }).categories
    );
    const description = extractText(component.description);
    const location = extractText(component.location);

    events.push({
      sourceKey: config.key,
      externalId,
      title,
      description: description ?? null,
      start,
      end,
      categories: mergeCategories(categories, config.tags),
      organizer,
      venue: location ?? config.defaultVenueName ?? null,
      status: mapIcsStatus(component.status) ?? config.defaultStatus,
    });
  });

  return events;
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

async function collectRssEvents(
  config: RssSourceConfig
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
  config: JsonSourceConfig
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

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry));
  return [String(value)];
}
