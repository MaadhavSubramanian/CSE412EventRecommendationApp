import type { EventRow } from "../../src/lib/types";

export type DummyVenue = {
  name: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  lat: number;
  lon: number;
};

export type DummyOrganizer = {
  org_name: string;
  website_url?: string | null;
};

export const DUMMY_VENUES: DummyVenue[] = [
  {
    name: "Desert Innovation Hub",
    street_address: "401 S Palm Dr",
    city: "Tempe",
    state: "AZ",
    postal_code: "85281",
    lat: 33.4018334,
    lon: -111.9275537,
  },
  {
    name: "Sunset Collaboration Center",
    street_address: "18 W University Blvd",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85004",
    lat: 33.4233738,
    lon: -112.0685545,
  },
  {
    name: "Mesa Civic Pavilion",
    street_address: "245 N Center St",
    city: "Mesa",
    state: "AZ",
    postal_code: "85201",
    lat: 33.4201177,
    lon: -111.8313473,
  },
  {
    name: "Canyon Learning Loft",
    street_address: "777 W Grand Ave",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85007",
    lat: 33.4551695,
    lon: -112.0870409,
  },
  {
    name: "Copper State Commons",
    street_address: "1225 S Mill Ave",
    city: "Tempe",
    state: "AZ",
    postal_code: "85281",
    lat: 33.4157808,
    lon: -111.9400562,
  },
  {
    name: "Camelback Cultural Hall",
    street_address: "950 E Camelback Rd",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85014",
    lat: 33.509305,
    lon: -112.0612974,
  },
  {
    name: "Arcadia Arts Annex",
    street_address: "3101 N 48th St",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85018",
    lat: 33.483843,
    lon: -111.977905,
  },
  {
    name: "Papago Tech Works",
    street_address: "690 N Scottsdale Rd",
    city: "Scottsdale",
    state: "AZ",
    postal_code: "85257",
    lat: 33.4761448,
    lon: -111.9261102,
  },
  {
    name: "Rio Salado Studio",
    street_address: "625 E Rio Salado Pkwy",
    city: "Tempe",
    state: "AZ",
    postal_code: "85281",
    lat: 33.4290302,
    lon: -111.9313851,
  },
  {
    name: "Downtown Discovery Lab",
    street_address: "55 W Jackson St",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85003",
    lat: 33.4449426,
    lon: -112.0743812,
  },
];

export const DUMMY_ORGANIZERS: DummyOrganizer[] = [
  {
    org_name: "Tempe Innovation Collective",
    website_url: "https://tempeinnovation.org",
  },
  {
    org_name: "Valley Venture Guild",
    website_url: "https://valleyventureguild.org",
  },
  {
    org_name: "Downtown Arts Council",
    website_url: "https://downtownartscouncil.org",
  },
  {
    org_name: "Sonoran Startup Studio",
    website_url: "https://sonoranstudio.org",
  },
];

export const DUMMY_EVENT_CATEGORIES: string[] = [
  "innovation",
  "entrepreneurship",
  "networking",
  "workshop",
  "arts",
  "community",
  "wellness",
  "tech",
  "music",
  "festival",
];

const STATUS_POOL: EventRow["status"][] = [
  "scheduled",
  "postponed",
  "cancelled",
];

export function pickRandomStatus(): EventRow["status"] {
  return STATUS_POOL[Math.floor(Math.random() * STATUS_POOL.length)];
}

export function pickRandomVenueId(venueIds: number[]): number | null {
  if (!venueIds.length) return null;
  const index = Math.floor(Math.random() * venueIds.length);
  return venueIds[index] ?? null;
}

export function pickRandomOrganizerId(organizerIds: number[]): number | null {
  if (!organizerIds.length) return null;
  const index = Math.floor(Math.random() * organizerIds.length);
  return organizerIds[index] ?? null;
}

export function pickRandomCategories(count = 2): string[] {
  if (!DUMMY_EVENT_CATEGORIES.length) return [];
  const pool = [...DUMMY_EVENT_CATEGORIES];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const take = Math.max(1, Math.min(count, pool.length));
  return pool.slice(0, take);
}
