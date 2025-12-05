CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE user_role AS ENUM ('visitor','organizer','admin');
CREATE TYPE event_status AS ENUM ('scheduled','cancelled','postponed');

CREATE TABLE IF NOT EXISTS app_user (
  user_id    BIGSERIAL PRIMARY KEY,
  role       user_role NOT NULL DEFAULT 'visitor',
  full_name  TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE  IF NOT EXISTS organizer (
  organizer_id BIGSERIAL PRIMARY KEY,
  user_id      BIGINT UNIQUE REFERENCES app_user(user_id) ON DELETE CASCADE,
  org_name     TEXT NOT NULL,
  website_url  TEXT
);

CREATE TABLE  IF NOT EXISTS venue (
  venue_id       BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  street_address TEXT,
  city           TEXT,
  state          TEXT,
  postal_code    TEXT,
  lat            DOUBLE PRECISION,
  lon            DOUBLE PRECISION,
  location GEOGRAPHY(POINT, 4326)
);
CREATE INDEX IF NOT EXISTS venue_location_gix ON venue USING GIST (location);

CREATE OR REPLACE FUNCTION sync_venue_location()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lon IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_venue_location ON venue;
CREATE TRIGGER trg_sync_venue_location
BEFORE INSERT OR UPDATE ON venue
FOR EACH ROW
EXECUTE FUNCTION sync_venue_location();



CREATE TABLE  IF NOT EXISTS event (
  event_id     BIGSERIAL PRIMARY KEY,
  organizer_id BIGINT REFERENCES organizer(organizer_id) ON DELETE SET NULL,
  venue_id     BIGINT REFERENCES venue(venue_id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  start_at     TIMESTAMPTZ NOT NULL,
  end_at       TIMESTAMPTZ NOT NULL,
  status       event_status NOT NULL DEFAULT 'scheduled',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
search_tsv      TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'B')
  ) STORED
);
CREATE INDEX IF NOT EXISTS event_time_idx   ON event (start_at, end_at);
CREATE INDEX IF NOT EXISTS event_status_idx ON event (status);
CREATE INDEX IF NOT EXISTS event_search_gin ON event USING GIN (search_tsv);

CREATE TABLE  IF NOT EXISTS event_category (
  event_id BIGINT REFERENCES event(event_id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  PRIMARY KEY (event_id, category)
);
CREATE INDEX IF NOT EXISTS event_cat_idx ON event_category (category);

CREATE OR REPLACE FUNCTION event_ids_within_radius(
  center_lat DOUBLE PRECISION,
  center_lon DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION
)
RETURNS TABLE(event_id BIGINT)
LANGUAGE sql
AS $$
  SELECT e.event_id
  FROM event e
  JOIN venue v ON v.venue_id = e.venue_id
  WHERE radius_miles IS NOT NULL
    AND v.location IS NOT NULL
    AND ST_DWithin(
      v.location,
      ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326)::geography,
      radius_miles * 1609.34
    );
$$;
