--app_user
insert into app_user (user_id, role, full_name, email, created_at) values (25, 'admin', 'Basel Kurian', 'basel@asu.edu', '2025-10-25 20:01:47.437207+00');
insert into app_user (user_id, role, full_name, email, created_at) values (26, 'organizer', 'ASU Engineering Ops', 'eng-ops@asu.edu', '2025-10-25 20:01:47.437207+00');
insert into app_user (user_id, role, full_name, email, created_at) values (27, 'organizer', 'ASU Arts & Events', 'arts@asu.edu', '2025-10-25 20:01:47.437207+00');
insert into app_user (user_id, role, full_name, email, created_at) values (28, 'organizer', 'Venture Devils', 'venturedevils@asu.edu', '2025-10-25 20:01:47.437207+00');
insert into app_user (user_id, role, full_name, email, created_at) values (29, 'visitor', 'Dens Sumesh', 'dens@asu.edu', '2025-10-25 20:01:47.437207+00');
insert into app_user (user_id, role, full_name, email, created_at) values (30, 'visitor', 'Maadhava Subramanian', 'maadhava@asu.edu', '2025-10-25 20:01:47.437207+00'); 

--organizer
insert into organizer (organizer_id, user_id, org_name, website_url) values (13, 26, 'ASU Ira A. Fulton Schools of Engineering', 'https://engineering.asu.edu');
insert into organizer (organizer_id, user_id, org_name, website_url) values (14, 27, 'ASU Arts & Events', 'https://arts.asu.edu');
insert into organizer (organizer_id, user_id, org_name, website_url) values (15, 28, 'ASU Venture Devils', 'https://entrepreneurship.asu.edu/venture-devils');

--venue
insert into venue (venue_id, name, street_address, city, state, postal_code, lat, lon, location) values (25, 'Memorial Union', '301 E Orange St', 'Tempe', 'AZ', '85287', 33.421204, -111.933158, ST_GeogFromText('0101000020E61000000D0055DCB8FB5BC0E2783E03EAB54040'));
insert into venue (venue_id, name, street_address, city, state, postal_code, lat, lon, location) values (26, 'Sun Devil Fitness Complex', '400 E Apache Blvd', 'Tempe', 'AZ', '85281', 33.416948, -111.932857, ST_GeogFromText('0101000020E61000000FB6D8EDB3FB5BC0F910548D5EB54040'));
insert into venue (venue_id, name, street_address, city, state, postal_code, lat, lon, location) values (27, 'ASU Gammage', '1200 S Forest Ave', 'Tempe', 'AZ', '85281', 33.414939, -111.938034, ST_GeogFromText('0101000020E61000004F22C2BF08FC5BC0DF6A9DB81CB54040'));
insert into venue (venue_id, name, street_address, city, state, postal_code, lat, lon, location) values (28, 'Hayden Library', '300 E Orange Mall', 'Tempe', 'AZ', '85281', 33.419807, -111.935257, ST_GeogFromText('0101000020E6100000B9162D40DBFB5BC0E1D05B3CBCB54040'));
insert into venue (venue_id, name, street_address, city, state, postal_code, lat, lon, location) values (29, 'ISTB7', '777 E University Dr', 'Tempe', 'AZ', '85281', 33.42098, -111.92994, ST_GeogFromText('0101000020E610000081CF0F2384FB5BC0922232ACE2B54040'));
insert into venue (venue_id, name, street_address, city, state, postal_code, lat, lon, location) values (30, 'Tempe Marketplace', '2000 E Rio Salado Pkwy', 'Tempe', 'AZ', '85281', 33.431736, -111.901596, ST_GeogFromText('0101000020E6100000158DB5BFB3F95BC0C040102043B74040'));

--event
insert into event (event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, search_tsv) values (54, 13, 25, 'AI for Everyone', 'Intro talk on practical AI tools for students and non-CS majors.', '2025-11-16 00:00:00+00', '2025-11-16 01:30:00+00', 'scheduled', '2025-10-25 20:01:47.437207+00', '2025-10-25 20:01:47.437207+00', '''ai'':1A,8B ''cs'':15B ''everyon'':3A ''intro'':4B ''major'':16B ''non'':14B ''non-c'':13B ''practic'':7B ''student'':11B ''talk'':5B ''tool'':9B');
insert into event (event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, search_tsv) values (55, 15, 29, 'Venture Devils Demo Night', 'Student founders pitch their startups; investor + mentor networking.', '2025-11-21 01:00:00+00', '2025-11-21 03:30:00+00', 'scheduled', '2025-10-25 20:01:47.437207+00', '2025-10-25 20:01:47.437207+00', '''demo'':3A ''devil'':2A ''founder'':6B ''investor'':10B ''mentor'':11B ''network'':12B ''night'':4A ''pitch'':7B ''startup'':9B ''student'':5B ''ventur'':1A');
insert into event (event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, search_tsv) values (56, 14, 27, 'Fall Theatre Gala', 'An evening of student performances curated by ASU Arts.', '2025-11-09 02:00:00+00', '2025-11-09 04:30:00+00', 'scheduled', '2025-10-25 20:01:47.437207+00', '2025-10-25 20:01:47.437207+00', '''art'':12B ''asu'':11B ''curat'':9B ''even'':5B ''fall'':1A ''gala'':3A ''perform'':8B ''student'':7B ''theatr'':2A');
insert into event (event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, search_tsv) values (57, 13, 28, 'Zotero + Research Strategies', 'Hands-on workshop on citation managers and literature search.', '2025-11-05 22:00:00+00', '2025-11-05 23:15:00+00', 'postponed', '2025-10-25 20:01:47.437207+00', '2025-10-25 20:01:47.437207+00', '''citat'':9B ''hand'':5B ''hands-on'':4B ''literatur'':12B ''manag'':10B ''research'':2A ''search'':13B ''strategi'':3A ''workshop'':7B ''zotero'':1A');
insert into event (event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, search_tsv) values (58, 13, 26, 'HIIT at SDFC', 'High-intensity interval training - open to all experience levels.', '2025-11-07 14:00:00+00', '2025-11-07 14:50:00+00', 'scheduled', '2025-10-25 20:01:47.437207+00', '2025-10-25 20:01:47.437207+00', '''experi'':12B ''high'':5B ''high-intens'':4B ''hiit'':1A ''intens'':6B ''interv'':7B ''level'':13B ''open'':9B ''sdfc'':3A ''train'':8B');
insert into event (event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, search_tsv) values (59, 13, 25, 'CSE 412 Study Jam', 'Peer-led exam prep - relational algebra, SQL, and indexing.', '2025-11-11 01:00:00+00', '2025-11-11 03:00:00+00', 'scheduled', '2025-10-25 20:01:47.437207+00', '2025-10-25 20:01:47.437207+00', '''412'':2A ''algebra'':11B ''cse'':1A ''exam'':8B ''index'':14B ''jam'':4A ''led'':7B ''peer'':6B ''peer-l'':5B ''prep'':9B ''relat'':10B ''sql'':12B ''studi'':3A');
insert into event (event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, search_tsv) values (60, 14, 30, 'Market Beats Live', 'Local bands, food trucks, and community booths.', '2025-11-23 00:30:00+00', '2025-11-23 04:30:00+00', 'scheduled', '2025-10-25 20:01:47.437207+00', '2025-10-25 20:01:47.437207+00', '''band'':5B ''beat'':2A ''booth'':10B ''communiti'':9B ''food'':6B ''live'':3A ''local'':4B ''market'':1A ''truck'':7B');
insert into event (event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, search_tsv) values (61, 13, 29, 'Hack Night: Data Pipelines', 'Build an ETL to ingest ICS/RSS feeds into Postgres.', '2025-11-13 02:00:00+00', '2025-11-13 05:00:00+00', 'cancelled', '2025-10-25 20:01:47.437207+00', '2025-10-25 20:01:47.437207+00', '''build'':5B ''data'':3A ''etl'':7B ''feed'':11B ''hack'':1A ''ics/rss'':10B ''ingest'':9B ''night'':2A ''pipelin'':4A ''postgr'':13B');
insert into event (event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, search_tsv) values (62, 15, 25, 'Founder Fireside: Scaling from 0 to 1', 'Q&A with alumni founders on MVPs, PMF, and fundraising.', '2025-11-30 01:30:00+00', '2025-11-30 03:00:00+00', 'scheduled', '2025-10-25 20:01:47.437207+00', '2025-10-25 20:01:47.437207+00', '''0'':5A ''1'':6A ''alumni'':10B ''firesid'':2A ''founder'':1A,11B ''fundrais'':16B ''mvps'':13B ''pmf'':14B ''q'':7B ''scale'':3A');
insert into event (event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, search_tsv) values (63, 14, 28, 'Student Art Gallery Opening', 'Reception + artist talks; refreshments served.', '2025-11-04 00:00:00+00', '2025-11-04 02:00:00+00', 'scheduled', '2025-10-25 20:01:47.437207+00', '2025-10-25 20:01:47.437207+00', '''art'':2A ''artist'':6B ''galleri'':3A ''open'':4A ''recept'':5B ''refresh'':8B ''serv'':9B ''student'':1A ''talk'':7B');
insert into event (event_id, organizer_id, venue_id, title, description, start_at, end_at, status, created_at, updated_at, search_tsv) values (66, 13, 25, 'AI for Everyone', 'Intro talk on AI tools for students', '2025-11-16 00:00:00+00', '2025-11-16 01:30:00+00', 'cancelled', '2025-10-25 20:03:56.800902+00', '2025-10-25 20:04:19.026365+00', '''ai'':1A,7B ''everyon'':3A ''intro'':4B ''student'':10B ''talk'':5B ''tool'':8B');

--event_category
insert into event_category (event_id, category) values (54, 'lecture');
insert into event_category (event_id, category) values (54, 'tech');
insert into event_category (event_id, category) values (54, 'workshop');
insert into event_category (event_id, category) values (55, 'entrepreneurship');
insert into event_category (event_id, category) values (55, 'pitch');
insert into event_category (event_id, category) values (55, 'networking');
insert into event_category (event_id, category) values (56, 'arts');
insert into event_category (event_id, category) values (56, 'theatre');
insert into event_category (event_id, category) values (56, 'performance');
insert into event_category (event_id, category) values (57, 'academic');
insert into event_category (event_id, category) values (57, 'library');
insert into event_category (event_id, category) values (57, 'workshop');
insert into event_category (event_id, category) values (58, 'fitness');
insert into event_category (event_id, category) values (58, 'health');
insert into event_category (event_id, category) values (59, 'study');
insert into event_category (event_id, category) values (59, 'academic');
insert into event_category (event_id, category) values (59, 'cs');
insert into event_category (event_id, category) values (60, 'music');
insert into event_category (event_id, category) values (60, 'festival');
insert into event_category (event_id, category) values (60, 'community');
insert into event_category (event_id, category) values (61, 'hackathon');
insert into event_category (event_id, category) values (61, 'tech');
insert into event_category (event_id, category) values (61, 'data');
insert into event_category (event_id, category) values (62, 'entrepreneurship');
insert into event_category (event_id, category) values (62, 'talk');
insert into event_category (event_id, category) values (62, 'startup');
insert into event_category (event_id, category) values (63, 'arts');
insert into event_category (event_id, category) values (63, 'exhibit');
insert into event_category (event_id, category) values (63, 'reception');
insert into event_category (event_id, category) values (66, 'tech');

select setval('app_user_user_id_seq', (select max(user_id) from app_user));
select setval('organizer_organizer_id_seq', (select max(organizer_id) from organizer));
select setval('venue_venue_id_seq', (select max(venue_id) from venue));
select setval('event_event_id_seq', (select max(event_id) from event));



