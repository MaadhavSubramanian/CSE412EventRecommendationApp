"use client";

import { useEffect, useMemo, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { FilterBar, type Filters } from "@/components/FilterBar";
import CreateEventModal from "@/components/CreateEventModal";
import { supabase } from "@/lib/supabaseClient";
import type { EventRow, OrganizerRow, VenueRow } from "@/lib/types";

// create form moved into CreateEventModal component

const emptyFilters: Filters = {
  query: "",
  category: "",
  status: "",
  startDate: "",
  endDate: "",
};

const PAGE_SIZE = 10;

export default function HomePage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  // create/save state handled inside the modal
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [events, filters]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, orgRes, venueRes] = await Promise.all([
        supabase
          .from("event")
          .select(
            "event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, event_category(category), organizer:organizer_id(org_name, website_url), venue:venue_id(name, city, state, street_address)",
          )
          .order("start_at", { ascending: true }),
        supabase
          .from("organizer")
          .select("organizer_id, org_name")
          .order("org_name", { ascending: true }),
        supabase
          .from("venue")
          .select("venue_id, name")
          .order("name", { ascending: true }),
      ]);

      if (eventRes.error) throw eventRes.error;
      if (orgRes.error) throw orgRes.error;
      if (venueRes.error) throw venueRes.error;

      const normalizedEvents = (eventRes.data ?? []).map((row) => ({
        ...row,
        organizer: Array.isArray(row.organizer)
          ? row.organizer[0] ?? null
          : row.organizer ?? null,
        venue: Array.isArray(row.venue)
          ? row.venue[0] ?? null
          : row.venue ?? null,
      })) as EventRow[];

      setEvents(normalizedEvents);
      setOrganizers((orgRes.data ?? []) as OrganizerRow[]);
      setVenues((venueRes.data ?? []) as VenueRow[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((event) =>
      event.event_category?.forEach((cat) => set.add(cat.category)),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const filteredEvents = useMemo(() => {
    const term = filters.query.trim().toLowerCase();
    const startMs = filters.startDate
      ? new Date(filters.startDate).getTime()
      : null;
    const endMs = filters.endDate
      ? new Date(`${filters.endDate}T23:59:59`).getTime()
      : null;

    return events.filter((event) => {
      const startTime = new Date(event.start_at).getTime();
      const haystack = `${event.title} ${event.description ?? ""} ${
        event.organizer?.org_name ?? ""
      } ${event.venue?.name ?? ""} ${(event.event_category ?? [])
        .map((c) => c.category)
        .join(" ")}`.toLowerCase();

      if (term && !haystack.includes(term)) return false;
      if (filters.category) {
        const hasCategory = event.event_category?.some(
          (cat) => cat.category === filters.category,
        );
        if (!hasCategory) return false;
      }
      if (filters.status && event.status !== filters.status) return false;
      if (startMs && (Number.isNaN(startTime) || startTime < startMs))
        return false;
      if (endMs && (Number.isNaN(startTime) || startTime > endMs)) return false;

      return true;
    });
  }, [events, filters]);

  const totalPages = filteredEvents.length
    ? Math.ceil(filteredEvents.length / PAGE_SIZE)
    : 1;
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedEvents = filteredEvents.slice(
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

  const scheduledCount = useMemo(
    () => events.filter((ev) => ev.status === "scheduled").length,
    [events],
  );
  const venueCount = useMemo(
    () => new Set(venues.map((v) => v.name)).size,
    [venues],
  );

  // create logic moved into CreateEventModal

  return (
    <main className="page-shell">
      <CreateEventModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        organizers={organizers}
        venues={venues}
        onCreated={() => {
          void loadAll();
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
            {loading ? "Loading..." : `${filteredEvents.length} shown`}
          </span>
        </div>

        <div className="action-row">
          <button className="btn secondary" onClick={() => setShowCreate(true)}>
            Create an event
          </button>
          <span className="muted small">
            {loading
              ? "Loading events..."
              : `${events.length} total · ${scheduledCount} scheduled · ${venueCount} venues · ${categories.length} categories`}
          </span>
        </div>

        <FilterBar
          categories={categories}
          filters={filters}
          onChange={setFilters}
          disabled={loading || events.length === 0}
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

        {!loading && filteredEvents.length === 0 ? (
          <p className="muted">No events match those filters.</p>
        ) : null}

        {!loading && filteredEvents.length > 0 ? (
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
