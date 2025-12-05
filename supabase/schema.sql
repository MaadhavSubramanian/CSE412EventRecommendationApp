CREATE TABLE public.app_user (
  user_id bigint NOT NULL DEFAULT nextval('app_user_user_id_seq'::regclass),
  role USER-DEFINED NOT NULL DEFAULT 'visitor'::user_role,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_user_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.event (
  event_id bigint NOT NULL DEFAULT nextval('event_event_id_seq'::regclass),
  organizer_id bigint,
  venue_id bigint,
  title text NOT NULL,
  description text,
  start_at timestamp with time zone NOT NULL,
  end_at timestamp with time zone NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'scheduled'::event_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  search_tsv tsvector DEFAULT (setweight(to_tsvector('english'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(description, ''::text)), 'B'::"char")),
  CONSTRAINT event_pkey PRIMARY KEY (event_id),
  CONSTRAINT event_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.organizer(organizer_id),
  CONSTRAINT event_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venue(venue_id)
);
CREATE TABLE public.event_category (
  event_id bigint NOT NULL,
  category text NOT NULL,
  CONSTRAINT event_category_pkey PRIMARY KEY (event_id, category),
  CONSTRAINT event_category_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event(event_id)
);
CREATE TABLE public.organizer (
  organizer_id bigint NOT NULL DEFAULT nextval('organizer_organizer_id_seq'::regclass),
  user_id bigint UNIQUE,
  org_name text NOT NULL,
  website_url text,
  CONSTRAINT organizer_pkey PRIMARY KEY (organizer_id),
  CONSTRAINT organizer_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(user_id)
);
CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.venue (
  venue_id bigint NOT NULL DEFAULT nextval('venue_venue_id_seq'::regclass),
  name text NOT NULL,
  street_address text,
  city text,
  state text,
  postal_code text,
  lat double precision,
  lon double precision,
  location USER-DEFINED,
  CONSTRAINT venue_pkey PRIMARY KEY (venue_id)
);