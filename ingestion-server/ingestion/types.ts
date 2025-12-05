import type { EventRow } from "../../src/lib/types";

export type NormalizedEvent = {
  sourceKey: string;
  externalId: string;
  title: string;
  description?: string | null;
  start: Date;
  end: Date;
  categories: string[];
  organizer?: string | null;
  venue?: string | null;
  venueLat?: number | null;
  venueLon?: number | null;
  venueStreet?: string | null;
  venueCity?: string | null;
  venueState?: string | null;
  venuePostalCode?: string | null;
  status?: EventRow["status"];
};

export type BaseSourceConfig = {
  key: string;
  enabled?: boolean;
  tags?: string[];
  defaultStatus?: EventRow["status"];
  defaultOrganizerId?: number;
  defaultOrganizerName?: string;
  defaultVenueId?: number;
  defaultVenueName?: string;
};

export type IcsSourceConfig = BaseSourceConfig & {
  type: "ics";
  url: string;
  defaultDurationMinutes?: number;
};

export type RssSourceConfig = BaseSourceConfig & {
  type: "rss";
  url: string;
  defaultDurationMinutes?: number;
};

export type JsonSourceConfig = BaseSourceConfig & {
  type: "json";
  url: string;
};

export type EventSourceConfig =
  | IcsSourceConfig
  | RssSourceConfig
  | JsonSourceConfig;

export type SourceResult = {
  config: EventSourceConfig;
  events: NormalizedEvent[];
};
