export type EventRow = {
  event_id: number;
  organizer_id: number | null;
  venue_id: number | null;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  status: 'scheduled' | 'cancelled' | 'postponed';
  created_at: string;
  updated_at: string;
  event_category?: { category: string }[] | null;
  organizer?: { org_name: string; website_url: string | null } | null;
  venue?: {
    name: string;
    city: string | null;
    state: string | null;
    street_address: string | null;
  } | null;
};

export type OrganizerRow = {
  organizer_id: number;
  org_name: string;
};

export type VenueRow = {
  venue_id: number;
  name: string;
};
