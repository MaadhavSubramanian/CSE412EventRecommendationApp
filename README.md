# CSE412 Event Recommendation App
Authors: Maadhava Subramanian, Dens Sumesh, Basel Kourian.

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
