// The active incident: a replay of the real fire at one moment, computed by packages/core from the fixtures.
import { DEMO_FIRE, type Fixture, incidentAt, loadFixture } from "@evac/core";
import type { CallArguments } from "../slng/evac-agent.js";

export interface PlaceAtRisk {
  id: string;
  name: string;
  type: string;
  town: string | null;
  distance_km: number;
  /** Where the fire is, seen from the place (the fire is to the north-west of the place). */
  fire_direction: string;
  arrival_estimate: string;
  /** Why nobody is likely inside now (weekend, school holidays), or null. */
  likely_empty: string | null;
  instructions: string;
}

export interface Incident {
  source: string;
  /** Spoken at the start of every call: this is an exercise with a replayed past fire, not a live fire. */
  call_context: string;
  incident_name: string;
  /** The replayed moment. */
  replay_time: string;
  /** Latest satellite pass used: how old the fire data is. */
  data_time: string;
  wind: string;
  /** Places at risk per estimated arrival band. */
  counts: { within_1h: number; within_3h: number; within_6h: number };
  places: PlaceAtRisk[];
}

// The replayed moment. Default: first hour with a large front (197 hotspots) and strong westerly wind.
// Override with REPLAY_TIME (ISO UTC) to replay another hour; the dashboard slider will set it in M3.
const DEFAULT_REPLAY_TIME = "2026-07-25T14:00:00Z";

/** Spoken and shown to people in Spain: "25 July, 15:02 Spanish time". */
export const localTime = (iso: string) =>
  `${new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/Madrid", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} Spanish time`;

// Loaded once: the fixture does not change while the bot runs.
let fixture: Fixture | undefined;

export function loadIncident(): Incident {
  fixture ??= loadFixture(DEMO_FIRE);
  const fx = fixture;
  const time = new Date(process.env.REPLAY_TIME || DEFAULT_REPLAY_TIME);
  if (Number.isNaN(time.getTime()))
    throw new Error(`REPLAY_TIME is not a date: ${process.env.REPLAY_TIME}`);
  const inc = incidentAt(fx, time);
  return {
    source: `REPLAY of real data, not a live fire. ${fx.sources.map((s) => s.name).join("; ")}. Arrival times are estimates from a wind cone (spread = 10% of wind speed), not a fire simulation.`,
    call_context: `This is an exercise, not a real emergency. It uses real data from a past fire, replayed at ${localTime(inc.time)}.`,
    incident_name: fx.meta.name,
    replay_time: localTime(inc.time),
    data_time: inc.data_time ? localTime(inc.data_time) : "no satellite detection yet",
    wind: inc.wind_text,
    counts: inc.counts,
    places: inc.places.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.kind,
      town: p.town,
      distance_km: p.distance_km,
      fire_direction: p.fire_direction,
      arrival_estimate: p.arrival_estimate,
      likely_empty: p.likely_empty,
      instructions: p.instructions,
    })),
  };
}

export function callArguments(incident: Incident, place: PlaceAtRisk): CallArguments {
  return {
    call_context: incident.call_context,
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
