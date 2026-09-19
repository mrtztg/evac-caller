// The active incident: places at risk, ranked. M1 reads a labelled test fixture; M2 replaces it with packages/core.
import { readFileSync } from "node:fs";
import type { CallArguments } from "../slng/evac-agent.js";

export interface PlaceAtRisk {
  id: string;
  name: string;
  type: string;
  distance_km: number;
  /** Where the fire is, seen from the place (the fire is to the north-west of the place). */
  fire_direction: string;
  arrival_estimate: string;
  instructions: string;
}

export interface Incident {
  source: string;
  incident_name: string;
  data_time: string;
  wind: string;
  places: PlaceAtRisk[];
}

const FIXTURE = new URL("../../../../data/fixtures/m1-places-at-risk.json", import.meta.url);

export function loadIncident(): Incident {
  return JSON.parse(readFileSync(FIXTURE, "utf8")) as Incident;
}

export function callArguments(incident: Incident, place: PlaceAtRisk): CallArguments {
  return {
    place_name: place.name,
    place_type: place.type,
    incident_name: incident.incident_name,
    fire_distance_km: String(place.distance_km),
    fire_direction: place.fire_direction,
    arrival_estimate: place.arrival_estimate,
    wind: incident.wind,
    instructions: place.instructions,
    data_time: incident.data_time,
  };
}
