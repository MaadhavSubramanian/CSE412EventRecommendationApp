"use client";

import { useState } from "react";
import Modal from "./Modal";
import { supabase } from "@/lib/supabaseClient";
import type { OrganizerRow, VenueRow, EventRow } from "@/lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  organizers: OrganizerRow[];
  venues: VenueRow[];
  onCreated?: () => void;
};

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
  categories: "",
};

const STATUSES: EventRow["status"][] = ["scheduled", "postponed", "cancelled"];

export default function CreateEventModal({
  isOpen,
  onClose,
  organizers,
  venues,
  onCreated,
}: Props) {
  const [form, setForm] = useState<NewEventForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        status: form.status,
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
        const catRows = cats.map((category) => ({
          event_id: newEventId,
          category,
        }));
        const { error: catError } = await supabase
          .from("event_category")
          .insert(catRows);
        if (catError) throw catError;
      }

      setForm(emptyForm);
      onCreated?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create event";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(emptyForm);
    setError(null);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Create event">
      <div>
        <div className="section-header">
          <div>
            <p className="eyebrow subtle">Create</p>
            <h2 className="section-title">Add an event</h2>
            <p className="muted">Capture details, status, and categories.</p>
          </div>
          <button
            className="btn ghost"
            onClick={onClose}
            aria-label="Close dialog">
            Close
          </button>
        </div>

        {error ? (
          <div className="alert error">
            <strong>Error:</strong> {error}
          </div>
        ) : null}

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
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as EventRow["status"],
                  })
                }>
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
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Intro talk on practical AI tools..."
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Organizer</span>
              <select
                className="input"
                value={form.organizer_id}
                onChange={(e) =>
                  setForm({ ...form, organizer_id: e.target.value })
                }>
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
                onChange={(e) =>
                  setForm({ ...form, venue_id: e.target.value })
                }>
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
              onClick={handleReset}
              disabled={saving}>
              Reset
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Saving..." : "Create event"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
