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

export const DUMMY_VENUES: DummyVenue[] = [
  {
    name: "Desert Innovation Hub",
    street_address: "401 S Palm Dr",
    city: "Tempe",
    state: "AZ",
    postal_code: "85281",
    lat: 33.4193,
    lon: -111.9345,
  },
  {
    name: "Sunset Collaboration Center",
    street_address: "18 W University Blvd",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85004",
    lat: 33.4514,
    lon: -112.0738,
  },
  {
    name: "Mesa Civic Pavilion",
    street_address: "245 N Center St",
    city: "Mesa",
    state: "AZ",
    postal_code: "85201",
    lat: 33.4222,
    lon: -111.8226,
  },
  {
    name: "Canyon Learning Loft",
    street_address: "777 W Grand Ave",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85007",
    lat: 33.4529,
    lon: -112.0887,
  },
  {
    name: "Copper State Commons",
    street_address: "1225 S Mill Ave",
    city: "Tempe",
    state: "AZ",
    postal_code: "85281",
    lat: 33.4102,
    lon: -111.9402,
  },
  {
    name: "Camelback Cultural Hall",
    street_address: "950 E Camelback Rd",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85014",
    lat: 33.5093,
    lon: -112.0618,
  },
  {
    name: "Arcadia Arts Annex",
    street_address: "3101 N 48th St",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85018",
    lat: 33.483,
    lon: -111.9826,
  },
  {
    name: "Papago Tech Works",
    street_address: "690 N Scottsdale Rd",
    city: "Scottsdale",
    state: "AZ",
    postal_code: "85257",
    lat: 33.4543,
    lon: -111.9258,
  },
  {
    name: "Rio Salado Studio",
    street_address: "625 E Rio Salado Pkwy",
    city: "Tempe",
    state: "AZ",
    postal_code: "85281",
    lat: 33.4308,
    lon: -111.9307,
  },
  {
    name: "Downtown Discovery Lab",
    street_address: "55 W Jackson St",
    city: "Phoenix",
    state: "AZ",
    postal_code: "85003",
    lat: 33.4465,
    lon: -112.0742,
  },
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
