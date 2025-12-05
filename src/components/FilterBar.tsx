import type { EventRow } from "@/lib/types";

export type Filters = {
  query: string;
  category: string;
  status: EventRow["status"] | "";
  startDate: string;
  endDate: string;
  radiusMiles: number | null;
};

type Props = {
  categories: string[];
  filters: Filters;
  onChange: (next: Filters) => void;
  disabled?: boolean;
  hasLocation: boolean;
  locating: boolean;
  onRequestLocation: () => void;
  locationStatus: string;
};

export function FilterBar({
  categories,
  filters,
  onChange,
  disabled,
  hasLocation,
  locating,
  onRequestLocation,
  locationStatus,
}: Props) {
  const update = (next: Partial<Filters>) => {
    onChange({ ...filters, ...next });
  };

  const clear = () =>
    onChange({
      query: "",
      category: "",
      status: "",
      startDate: "",
      endDate: "",
      radiusMiles: null,
    });

  return (
    <div className="filter-bar glass">
      <label className="field wide">
        <span>Search</span>
        <input
          type="search"
          className="input"
          placeholder="Search by title, description, organizer, venue"
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          disabled={disabled}
        />
      </label>

      <div className="filter-grid">
        <label className="field">
          <span>Category</span>
          <select
            className="input"
            value={filters.category}
            onChange={(e) => update({ category: e.target.value })}
            disabled={disabled}>
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Starts after</span>
          <input
            type="date"
            className="input"
            value={filters.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
            disabled={disabled}
          />
        </label>

        <label className="field">
          <span>Starts before</span>
          <input
            type="date"
            className="input"
            value={filters.endDate}
            onChange={(e) => update({ endDate: e.target.value })}
            disabled={disabled}
          />
        </label>

        <label className="field">
          <span>Status</span>
          <select
            className="input"
            value={filters.status}
            onChange={(e) =>
              update({ status: e.target.value as Filters["status"] })
            }
            disabled={disabled}>
            <option value="">Any status</option>
            <option value="scheduled">Scheduled</option>
            <option value="postponed">Postponed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="field">
          <span>Distance</span>
          <select
            className="input"
            value={filters.radiusMiles ?? ""}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null;
              if (value && !hasLocation && !locating) {
                onRequestLocation();
              }
              update({ radiusMiles: value });
            }}
            disabled={disabled}>
            <option value="">Anywhere</option>
            <option value="5">Within 5 miles</option>
            <option value="10">Within 10 miles</option>
            <option value="15">Within 15 miles</option>
          </select>
        </label>

        <div className="field location-control">
          <span>Location</span>
          <p className="location-status">
            {locating
              ? "Locating…"
              : hasLocation
              ? locationStatus
              : "Pick a distance filter to request your location."}
          </p>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={clear}
            disabled={disabled}>
            Clear filters
          </button>
        </div>
      </div>
    </div>
  );
}
