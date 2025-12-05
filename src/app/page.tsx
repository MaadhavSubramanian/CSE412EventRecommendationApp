"use client";

import { useEffect, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { FilterBar, type Filters } from "@/components/FilterBar";
import CreateEventModal from "@/components/CreateEventModal";
import { supabase } from "@/lib/supabaseClient";
import type { EventRow, OrganizerRow, VenueRow } from "@/lib/types";

type Coordinates = {
  lat: number;
  lon: number;
};

type Stats = {
  totalEvents: number;
  scheduledEvents: number;
  venueCount: number;
  categoryCount: number;
};

// create form moved into CreateEventModal component

const emptyFilters: Filters = {
  query: "",
  category: "",
  status: "",
  startDate: "",
  endDate: "",
  radiusMiles: null,
};

const PAGE_SIZE = 10;

export default function HomePage() {
  const [allEvents, setAllEvents] = useState<EventRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  // create/save state handled inside the modal
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    scheduledEvents: 0,
    venueCount: 0,
    categoryCount: 0,
  });

  useEffect(() => {
    void Promise.all([loadMeta(), loadAllEvents()]);
  }, []);

  useEffect(() => {
    if (!allEvents.length) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    if (filters.radiusMiles && !userLocation) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      let filtered = [...allEvents];

      if (filters.status) {
        filtered = filtered.filter((event) => event.status === filters.status);
      }

      if (filters.startDate) {
        const start = new Date(`${filters.startDate}T00:00:00`).getTime();
        filtered = filtered.filter(
          (event) => new Date(event.start_at).getTime() >= start,
        );
      }

      if (filters.endDate) {
        const end = new Date(`${filters.endDate}T23:59:59`).getTime();
        filtered = filtered.filter(
          (event) => new Date(event.start_at).getTime() <= end,
        );
      }

      if (filters.category) {
        filtered = filtered.filter((event) =>
          (event.event_category ?? []).some(
            (cat) => cat.category === filters.category,
          ),
        );
      }

      if (filters.query.trim()) {
        const term = filters.query.trim().toLowerCase();
        filtered = filtered.filter((event) => {
          const haystack = [
            event.title,
            event.description ?? "",
            event.organizer?.org_name ?? "",
            event.venue?.name ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(term);
        });
      }

      if (filters.radiusMiles && userLocation) {
        filtered = filtered.filter((event) => {
          const venueLat = event.venue?.lat;
          const venueLon = event.venue?.lon;
          if (
            typeof venueLat !== "number" ||
            typeof venueLon !== "number" ||
            Number.isNaN(venueLat) ||
            Number.isNaN(venueLon)
          ) {
            return false;
          }
          const distance = haversineDistance(
            userLocation.lat,
            userLocation.lon,
            venueLat,
            venueLon,
          );
          return distance <= filters.radiusMiles!;
        });
      }

      setEvents(filtered);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to filter events";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters, userLocation, allEvents]);

  useEffect(() => {
    setPage(1);
  }, [filters, userLocation]);

  async function loadMeta() {
    setMetaLoading(true);
    try {
      const [orgRes, venueRes, categoryRes, totalRes, scheduledRes] =
        await Promise.all([
          supabase
            .from("organizer")
            .select("organizer_id, org_name")
            .order("org_name", { ascending: true })
            .limit(10000),
          supabase
            .from("venue")
            .select("venue_id, name")
            .order("name", { ascending: true })
            .limit(10000),
          supabase.from("event_category").select("category").limit(10000),
          supabase
            .from("event")
            .select("event_id", { count: "exact", head: true })
            .limit(10000),
          supabase
            .from("event")
            .select("event_id", { count: "exact", head: true })
            .eq("status", "scheduled")
            .limit(10000),
        ]);

      if (orgRes.error) throw orgRes.error;
      if (venueRes.error) throw venueRes.error;
      if (categoryRes.error) throw categoryRes.error;
      if (totalRes.error) throw totalRes.error;
      if (scheduledRes.error) throw scheduledRes.error;

      const categoryList = Array.from(
        new Set((categoryRes.data ?? []).map((row) => row.category)),
      )
        .filter((cat): cat is string => Boolean(cat))
        .sort((a, b) => a.localeCompare(b));

      setOrganizers((orgRes.data ?? []) as OrganizerRow[]);
      setVenues((venueRes.data ?? []) as VenueRow[]);
      setCategoryOptions(categoryList);
      setStats({
        totalEvents: totalRes.count ?? 0,
        scheduledEvents: scheduledRes.count ?? 0,
        venueCount: venueRes.data?.length ?? 0,
        categoryCount: categoryList.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      setError(msg);
    } finally {
      setMetaLoading(false);
    }
  }

  async function loadAllEvents() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: eventError } = await supabase
        .from("event")
        .select(
          "event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, event_category(category), organizer:organizer_id(org_name, website_url), venue:venue_id(name, city, state, street_address, lat, lon)",
        )
        .order("start_at", { ascending: true })
        .limit(10000);
      if (eventError) throw eventError;

      const normalizedEvents = (data ?? []).map((row) => ({
        ...row,
        organizer: Array.isArray(row.organizer)
          ? row.organizer[0] ?? null
          : row.organizer ?? null,
        venue: Array.isArray(row.venue)
          ? row.venue[0] ?? null
          : row.venue ?? null,
      })) as EventRow[];

      setAllEvents(normalizedEvents);
      setEvents(normalizedEvents);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load events";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 3958.8; // miles
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const totalPages = events.length ? Math.ceil(events.length / PAGE_SIZE) : 1;
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedEvents: EventRow[] = events.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  const handlePageChange = (delta: number) => {
    setPage((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > totalPages) return totalPages;
      return next;
    });
  };

  function handleRequestLocation() {
    if (locating) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setLocationError(null);
        setLocating(false);
      },
      (err) => {
        setLocationError(err.message || "Failed to retrieve location.");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  const locationStatus = userLocation
    ? `Using your location (${userLocation.lat.toFixed(
        2,
      )}, ${userLocation.lon.toFixed(2)})`
    : locationError
    ? locationError
    : filters.radiusMiles
    ? "Location required to apply distance filter."
    : "Location not set.";

  // create logic moved into CreateEventModal

  return (
    <main className="page-shell">
      <CreateEventModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        organizers={organizers}
        venues={venues}
        onCreated={() => {
          void loadMeta();
          void loadAllEvents();
        }}
      />

      {error ? (
        <div className="alert error">
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      <section className="panel glass" id="events">
        <div className="section-header">
          <div>
            <p className="eyebrow subtle">Browse</p>
            <h2 className="section-title">Events</h2>
            <p className="muted">Search, filter, and click into the data.</p>
          </div>
          <span className="pill">
            {loading ? "Loading..." : `${events.length} shown`}
          </span>
        </div>

        <div className="action-row">
          <button className="btn secondary" onClick={() => setShowCreate(true)}>
            Create an event
          </button>
          <span className="muted small">
            {metaLoading
              ? "Loading stats..."
              : `${stats.totalEvents} total · ${stats.scheduledEvents} scheduled · ${stats.venueCount} venues · ${stats.categoryCount} categories`}
          </span>
        </div>

        <FilterBar
          categories={categoryOptions}
          filters={filters}
          onChange={setFilters}
          disabled={loading}
          hasLocation={Boolean(userLocation)}
          locating={locating}
          onRequestLocation={handleRequestLocation}
          locationStatus={locationStatus}
        />

        <div className="action-row">
          <button
            type="button"
            className="btn ghost"
            onClick={() => handlePageChange(-1)}
            disabled={loading || currentPage === 1}>
            Previous
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => handlePageChange(1)}
            disabled={
              loading ||
              currentPage === totalPages ||
              paginatedEvents.length === 0
            }>
            Next
          </button>
          <span className="muted">
            {loading
              ? "Preparing events..."
              : paginatedEvents.length === 0
              ? "No events to display"
              : `Page ${currentPage} of ${totalPages}`}
          </span>
        </div>

        {loading ? <p className="muted">Loading events…</p> : null}

        {!loading && events.length === 0 ? (
          <p className="muted">
            {filters.radiusMiles && !userLocation
              ? "Location access is required to apply the distance filter."
              : "No events match those filters."}
          </p>
        ) : null}

        {!loading && events.length > 0 ? (
          <div className="card-grid">
            {paginatedEvents.map((ev) => (
              <EventCard key={ev.event_id} event={ev} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
