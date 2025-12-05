# CSE412 Event Recommendation App
Authors: Maadhava Subramanian, Dens Sumesh, Basel Kurian.

A minimal Next.js + Supabase dashboard for the course project. It connects to your existing Supabase instance and lets you browse/search events and create new events with categories, organizer, and venue.

## Quick start

1) Install dependencies:
```
npm install
```
2) Copy env template and fill with your Supabase project values:
```
cp .env.local.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
```
3) Run the app:
```
npm run dev
```
4) Open http://localhost:3000

## What’s implemented
- Event list with search over title/description/categories.
- Event creation form (title, description, organizer, venue, start/end times, status, categories).
- Displays organizer + venue info; status badges for `scheduled`, `postponed`, `cancelled`.
- Uses Supabase anon key (works if RLS is disabled, as in the provided dataset).

## Notes
- Schema/seed are in `supabase/schema.sql` and `supabase/seed.sql`.
- Status values used: `scheduled`, `postponed`, `cancelled` (matches enum from Phase 1 report).
- If you enable RLS later, add policies to allow the anon role (or add auth and use the service key server-side).

## Useful commands
- `npm run dev` — start Next.js dev server
- `npm run lint` — run ESLint
- `npm run build && npm start` — production build + serve
- `npm run ingest:server` — start the polling server for Sun Devil Central events

## Ingestion pipeline
- Scripts live under `scripts/` with shared helpers in `scripts/ingestion/*`.
- Provide Supabase credentials via `SUPABASE_SERVICE_ROLE_KEY` (and optionally `INGEST_SUPABASE_URL`).
- Start the long-running server via `npm run ingest:server` to poll the Sun Devil Central ICS feed on an interval (default 15 minutes).
- Server-specific env overrides:
	- `SUN_DEVIL_ICS_URL` — override the feed URL.
	- `INGEST_POLL_MINUTES` — minutes between polls (default 15).
	- `INGEST_LOOKBACK_DAYS` — dedupe window (default 30).
	- `SUN_DEVIL_EVENT_DURATION_MINUTES` — fallback duration when an event lacks an end time (default 120).
- See `docs/ingestion-pipeline.md` for architecture details and future enhancements.
