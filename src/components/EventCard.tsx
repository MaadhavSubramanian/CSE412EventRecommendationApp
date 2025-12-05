import type { EventRow } from '@/lib/types';

function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  return `${formatter.format(new Date(start))} → ${formatter.format(new Date(end))}`;
}

function formatVenue(venue: EventRow['venue']) {
  if (!venue) return 'No venue yet';
  const cityBits = [venue.city, venue.state].filter(Boolean).join(', ');
  return cityBits ? `${venue.name} (${cityBits})` : venue.name;
}

export function EventCard({ event }: { event: EventRow }) {
  const categories = event.event_category ?? [];

  return (
    <article className="event-card glass">
      <div className="event-card__header">
        <div className="event-card__title">
          <p className="eyebrow subtle">Event #{event.event_id}</p>
          <h3>{event.title}</h3>
          <p className="muted">{formatDateRange(event.start_at, event.end_at)}</p>
        </div>
        <span className={`status-chip ${event.status}`}>{event.status}</span>
      </div>

      {event.description ? <p className="event-card__description">{event.description}</p> : null}

      <div className="event-card__tags">
        {categories.length ? (
          categories.map((cat) => (
            <span key={cat.category} className="pill">
              {cat.category}
            </span>
          ))
        ) : (
          <span className="pill muted">No categories yet</span>
        )}
      </div>

      <div className="event-card__meta">
        <span>Organizer: {event.organizer?.org_name ?? '—'}</span>
        <span>Venue: {formatVenue(event.venue)}</span>
      </div>
    </article>
  );
}
