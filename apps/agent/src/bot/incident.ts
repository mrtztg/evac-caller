// The active incident: a replay of the real fire at one moment, computed by packages/core from the fixtures.
import {
  DEFAULT_REPLAY_TIME,
  DEMO_FIRE,
  type Fixture,
  incidentAt,
  loadFixture,
  readReplayTime,
} from "@evac/core";
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
  /** The replayed moment, in words. */
  replay_time: string;
  /** The same moment as ISO UTC, so a later call can replay exactly the hour the coordinator saw. */
  replay_time_iso: string;
  /** Latest satellite pass used: how old the fire data is. */
  data_time: string;
  wind: string;
  /** Places at risk per estimated arrival band. */
  counts: { within_1h: number; within_3h: number; within_6h: number };
  places: PlaceAtRisk[];
}

/** Spoken and shown to people in Spain: "25 July, 15:02 Spanish time". */
export const localTime = (iso: string) =>
  `${new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/Madrid", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} Spanish time`;

// Loaded once: the fixture does not change while the bot runs.
let fixture: Fixture | undefined;

/**
 * The hour the coordinator last saw a list of places for. The calls use this hour, not the hour the
 * dashboard slider is on now, so moving the slider cannot change what the phone agent says about a
 * place the coordinator already approved.
 */
let shownIso: string | null = null;

export const rememberShownHour = (iso: string) => {
  shownIso = iso;
};
export const shownHour = () => shownIso;

/** Without `iso`: the dashboard slider wins, then REPLAY_TIME, then the default hour. */
export function loadIncident(iso?: string): Incident {
  fixture ??= loadFixture(DEMO_FIRE);
  const fx = fixture;
  const time = new Date(iso || readReplayTime() || process.env.REPLAY_TIME || DEFAULT_REPLAY_TIME);
  if (Number.isNaN(time.getTime()))
    throw new Error(`REPLAY_TIME is not a date: ${process.env.REPLAY_TIME}`);
  const inc = incidentAt(fx, time);
  return {
    source: `REPLAY of real data, not a live fire. ${fx.sources.map((s) => s.name).join("; ")}. Arrival times are estimates from a wind cone (spread = 10% of wind speed), not a fire simulation.`,
    call_context: `This is an exercise, not a real emergency. It uses real data from a past fire, replayed at ${localTime(inc.time)}.`,
    incident_name: fx.meta.name,
    replay_time: localTime(inc.time),
    replay_time_iso: inc.time,
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
