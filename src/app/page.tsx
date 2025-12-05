"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { EventRow, OrganizerRow, VenueRow } from "@/lib/types";

const STATUSES: EventRow["status"][] = ["scheduled", "postponed", "cancelled"];

function formatDate(value: string) {
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

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

export default function HomePage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return events;
    return events.filter((e) => {
      const haystack =
        `${e.title} ${e.description ?? ""} ${(e.event_category ?? [])
          .map((c) => c.category)
          .join(" ")}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [events, search]);

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
    <main className="page">
      <div className="title">
        <div>
          <h1>Event Recommendation Dashboard</h1>
          <div className="muted">Connected to Supabase (events, venues, organizers)</div>
        </div>
        <button className="btn secondary" onClick={() => void loadAll()} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "#ef4444", color: "#fecdd3" }}>
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      <div className="grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="title">
            <h3>Create Event</h3>
            <span className="muted">Status values: scheduled, postponed, cancelled</span>
          </div>
          <form className="grid" onSubmit={handleCreateEvent}>
            <div className="grid">
              <label className="label">Title</label>
              <input
                className="input"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="AI for Everyone"
              />
            </div>

            <div className="grid">
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Intro talk on practical AI tools..."
              />
            </div>

            <div className="form-row">
              <div className="grid">
                <label className="label">Organizer</label>
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
              </div>
              <div className="grid">
                <label className="label">Venue</label>
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
              </div>
            </div>

            <div className="form-row">
              <div className="grid">
                <label className="label">Start time</label>
                <input
                  required
                  className="input"
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                />
              </div>
              <div className="grid">
                <label className="label">End time</label>
                <input
                  required
                  className="input"
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                />
              </div>
              <div className="grid">
                <label className="label">Status</label>
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
              </div>
            </div>

            <div className="grid">
              <label className="label">Categories (comma-separated)</label>
              <input
                className="input"
                value={form.categories}
                onChange={(e) => setForm({ ...form, categories: e.target.value })}
                placeholder="lecture, tech"
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn secondary"
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

        <div className="card">
          <div className="title">
            <h3>Events</h3>
            <input
              className="input"
              style={{ maxWidth: 260 }}
              placeholder="Search by title/description/category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="muted">Loading events…</div>
          ) : filteredEvents.length === 0 ? (
            <div className="muted">No events found.</div>
          ) : (
            <div className="grid">
              {filteredEvents.map((ev) => (
                <div key={ev.event_id} className="card" style={{ borderColor: "#1f2937" }}>
                  <div className="title" style={{ marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h3 style={{ margin: 0 }}>{ev.title}</h3>
                        <span className={`status ${ev.status}`}>{ev.status}</span>
                      </div>
                      <div className="muted">
                        {formatDate(ev.start_at)} → {formatDate(ev.end_at)}
                      </div>
                    </div>
                    <div className="badge">#{ev.event_id}</div>
                  </div>

                  <p style={{ marginTop: 0 }}>{ev.description}</p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    {ev.event_category?.map((c) => (
                      <span key={c.category} className="pill">
                        {c.category}
                      </span>
                    )) || <span className="muted">No categories</span>}
                  </div>

                  <div className="muted">
                    {ev.organizer?.org_name ? `Organizer: ${ev.organizer.org_name}` : "No organizer"}
                    {" • "}
                    {ev.venue?.name
                      ? `Venue: ${ev.venue.name}${ev.venue.city ? ` (${ev.venue.city}${ev.venue.state ? ", " + ev.venue.state : ""})` : ""
                        }`
                      : "No venue"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
