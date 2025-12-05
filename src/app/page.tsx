"use client";

import { useEffect, useMemo, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { FilterBar, type Filters } from "@/components/FilterBar";
import { supabase } from "@/lib/supabaseClient";
import type { EventRow, OrganizerRow, VenueRow } from "@/lib/types";

const STATUSES: EventRow["status"][] = ["scheduled", "postponed", "cancelled"];

type NewEventForm = {
  title: string;
  description: string;
  organizer_id: string;
  venue_id: string;
  start_at: string;
  end_at: string;
  status: EventRow["status"];
  categories: string;
};

const emptyForm: NewEventForm = {
  title: "",
  description: "",
  organizer_id: "",
  venue_id: "",
  start_at: "",
  end_at: "",
  status: "scheduled",
  categories: ""
};

const emptyFilters: Filters = {
  query: "",
  category: "",
  status: "",
  startDate: "",
  endDate: ""
};

export default function HomePage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [form, setForm] = useState<NewEventForm>(emptyForm);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, orgRes, venueRes] = await Promise.all([
        supabase
          .from("event")
          .select(
            "event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, event_category(category), organizer:organizer_id(org_name, website_url), venue:venue_id(name, city, state, street_address)"
          )
          .order("start_at", { ascending: true }),
        supabase
          .from("organizer")
          .select("organizer_id, org_name")
          .order("org_name", { ascending: true }),
        supabase.from("venue").select("venue_id, name").order("name", { ascending: true })
      ]);

      if (eventRes.error) throw eventRes.error;
      if (orgRes.error) throw orgRes.error;
      if (venueRes.error) throw venueRes.error;

      setEvents(eventRes.data ?? []);
      setOrganizers(orgRes.data ?? []);
      setVenues(venueRes.data ?? []);
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
      event.event_category?.forEach((cat) => set.add(cat.category))
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const filteredEvents = useMemo(() => {
    const term = filters.query.trim().toLowerCase();
    const startMs = filters.startDate ? new Date(filters.startDate).getTime() : null;
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
          (cat) => cat.category === filters.category
        );
        if (!hasCategory) return false;
      }
      if (filters.status && event.status !== filters.status) return false;
      if (startMs && (Number.isNaN(startTime) || startTime < startMs)) return false;
      if (endMs && (Number.isNaN(startTime) || startTime > endMs)) return false;

      return true;
    });
  }, [events, filters]);

  const scheduledCount = useMemo(
    () => events.filter((ev) => ev.status === "scheduled").length,
    [events]
  );
  const venueCount = useMemo(
    () => new Set(venues.map((v) => v.name)).size,
    [venues]
  );

  async function handleCreateEvent(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        organizer_id: form.organizer_id ? Number(form.organizer_id) : null,
        venue_id: form.venue_id ? Number(form.venue_id) : null,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        status: form.status
      };

      if (!payload.title || !payload.start_at || !payload.end_at) {
        throw new Error("Title, start time, and end time are required.");
      }

      const { data: inserted, error: insertError } = await supabase
        .from("event")
        .insert([payload])
        .select("event_id")
        .single();

      if (insertError) throw insertError;

      const newEventId = inserted?.event_id;
      const cats = form.categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      if (newEventId && cats.length) {
        const catRows = cats.map((category) => ({ event_id: newEventId, category }));
        const { error: catError } = await supabase.from("event_category").insert(catRows);
        if (catError) throw catError;
      }

      setForm(emptyForm);
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create event";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="glass hero" id="about">
        <div className="hero__content">
          <p className="eyebrow">Event Discovery</p>
          <h1>Find, create, and manage events.</h1>
          <p className="lead">
            Connected to Supabase tables for events, venues, and organizers with filters that
            mirror your queries.
          </p>
          <div className="action-row">
            <button className="btn" onClick={() => void loadAll()} disabled={loading}>
              {loading ? "Syncing data..." : "Refresh from Supabase"}
            </button>
            <a className="btn secondary" href="#create">
              Create an event
            </a>
            <span className="muted">
              {loading ? "Loading events..." : `Loaded ${events.length} events`}
            </span>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total events</div>
              <div className="stat-value">{loading ? "—" : events.length}</div>
              <p className="muted">Up to date from Supabase</p>
            </div>
            <div className="stat-card">
              <div className="stat-label">Scheduled</div>
              <div className="stat-value">{loading ? "—" : scheduledCount}</div>
              <p className="muted">Currently planned sessions</p>
            </div>
            <div className="stat-card">
              <div className="stat-label">Venues</div>
              <div className="stat-value">{loading ? "—" : venueCount}</div>
              <p className="muted">Spaces available in the data</p>
            </div>
            <div className="stat-card">
              <div className="stat-label">Categories</div>
              <div className="stat-value">{loading ? "—" : categories.length}</div>
              <p className="muted">Topics attached to events</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="alert error">
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      <section className="split-grid">
        <div className="panel glass" id="create">
          <div className="section-header">
            <div>
              <p className="eyebrow subtle">Create</p>
              <h2 className="section-title">Add an event</h2>
              <p className="muted">
                Capture details, status, and categories. Organizer and venue options are pulled
                from Supabase.
              </p>
            </div>
            <span className="pill">Status options: scheduled, postponed, cancelled</span>
          </div>

          <form className="form-stack" onSubmit={handleCreateEvent}>
            <div className="form-grid">
              <label className="field">
                <span>Title</span>
                <input
                  className="input"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="AI for Everyone"
                />
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as EventRow["status"] })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Description</span>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Intro talk on practical AI tools..."
              />
            </label>

            <div className="form-grid">
              <label className="field">
                <span>Organizer</span>
                <select
                  className="input"
                  value={form.organizer_id}
                  onChange={(e) => setForm({ ...form, organizer_id: e.target.value })}
                >
                  <option value="">(optional)</option>
                  {organizers.map((o) => (
                    <option key={o.organizer_id} value={o.organizer_id}>
                      {o.org_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Venue</span>
                <select
                  className="input"
                  value={form.venue_id}
                  onChange={(e) => setForm({ ...form, venue_id: e.target.value })}
                >
                  <option value="">(optional)</option>
                  {venues.map((v) => (
                    <option key={v.venue_id} value={v.venue_id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Start time</span>
                <input
                  required
                  className="input"
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                />
              </label>
              <label className="field">
                <span>End time</span>
                <input
                  required
                  className="input"
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                />
              </label>
            </div>

            <label className="field">
              <span>Categories (comma-separated)</span>
              <input
                className="input"
                value={form.categories}
                onChange={(e) => setForm({ ...form, categories: e.target.value })}
                placeholder="lecture, tech, community"
              />
              <p className="muted small">Stored in the event_category table.</p>
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setForm(emptyForm)}
                disabled={saving}
              >
                Reset
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Saving..." : "Create event"}
              </button>
            </div>
          </form>
        </div>

        <div className="panel glass" id="events">
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

          <FilterBar
            categories={categories}
            filters={filters}
            onChange={setFilters}
            disabled={loading || events.length === 0}
          />

          {loading ? <p className="muted">Loading events…</p> : null}

          {!loading && filteredEvents.length === 0 ? (
            <p className="muted">No events match those filters.</p>
          ) : null}

          {!loading && filteredEvents.length > 0 ? (
            <div className="card-grid">
              {filteredEvents.map((ev) => (
                <EventCard key={ev.event_id} event={ev} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
