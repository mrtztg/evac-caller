// What /api/incident and /api/calls return. The shapes come from packages/core.
import type { CallEvent, Hotspot, IncidentState, Source } from "@evac/core";

export type { CallEvent, Hotspot };

export interface IncidentResponse extends Omit<IncidentState, "zones"> {
  meta: { id: string; name: string; wind_station: { name: string; lat: number; lon: number } };
  sources: Source[];
  /** Every hour of the replay, ISO UTC. */
  hours: string[];
  /** Hotspots in the active front at each hour: the bars under the slider. */
  front_by_hour: number[];
  /** [lat, lon] rings, ready for Leaflet. */
  zones: { hours: number; polygon: [number, number][] }[];
}

export type Place = IncidentResponse["places"][number];
