// The incident at one replay time: the fire front, the wind, the danger zones and the places at risk, ranked.
import { activeFront, exposure, HORIZONS_H, spreadKmh, windAt, zonePolygon } from "./danger.js";
import type { Fixture, Hotspot, Place, PlaceKind, WindObs } from "./fixture.js";
import { compass } from "./geo.js";

/** Harder to evacuate first: people who cannot walk or live there, then children, then outpatients. */
const KIND_ORDER: Record<PlaceKind, number> = {
  "care home": 0,
  hospital: 1,
  nursery: 2,
  school: 3,
  "health centre": 4,
};

export interface PlaceAtRisk extends Place {
  distance_km: number;
  /** Where the fire is, seen from the place ("the fire is to the north-west of the place"). */
  fire_direction: string;
  arrival_h: number;
  arrival_estimate: string;
  reason: "downwind" | "near";
  /** Why nobody is likely inside at this time (weekend, school holidays), or null. */
  likely_empty: string | null;
  instructions: string;
}

export interface IncidentState {
  time: string;
  /** Time of the latest satellite pass used: the age of the fire data. */
  data_time: string | null;
  wind: WindObs | null;
  /** Wind in words, for the phone agent and the bot. */
  wind_text: string;
  spread_kmh: number | null;
  front: Hotspot[];
  zones: { hours: number; polygon: [number, number][] }[];
  places: PlaceAtRisk[];
  /** Places at risk per arrival band. */
  counts: { within_1h: number; within_3h: number; within_6h: number };
}

export function arrivalText(h: number): string {
  if (h < 1) return "less than 1 hour";
  const n = Math.round(h);
  return n === 1 ? "about 1 hour" : `about ${n} hours`;
}

// Same fixed text for every place in a band: the coordinator reads it before approving the calls.
export function instructionFor(arrivalH: number): string {
  if (arrivalH <= 1)
    return "Start moving everyone away from the fire now, and follow the orders of the emergency services on site.";
  if (arrivalH <= 3)
    return "Prepare to evacuate now: get people and transport ready, and follow the orders of the emergency services.";
  return "Be ready to evacuate: check who needs help to move, and keep this phone line free.";
}

/**
 * Schools and nurseries are closed at weekends, schools also in July and August (Valencian school
 * calendar). Rough on purpose: the place stays in the list, it only moves down.
 */
export function likelyEmpty(kind: PlaceKind, time: Date): string | null {
  if (kind !== "school" && kind !== "nursery") return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    month: "numeric",
  }).formatToParts(time);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  if (part("weekday") === "Sat" || part("weekday") === "Sun") return "weekend";
  if (kind === "school" && ["7", "8"].includes(part("month") ?? ""))
    return "school summer holidays";
  return null;
}

export function rank(places: PlaceAtRisk[]): PlaceAtRisk[] {
  // Same hour band: places with people inside first, then the place that is harder to evacuate.
  return [...places].sort(
    (a, b) =>
      Math.ceil(a.arrival_h) - Math.ceil(b.arrival_h) ||
      Number(a.likely_empty !== null) - Number(b.likely_empty !== null) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.arrival_h - b.arrival_h,
  );
}

export function incidentAt(fx: Fixture, time: Date): IncidentState {
  const front = activeFront(fx.hotspots, time);
  const wind = windAt(fx.wind, time);
  const base = {
    time: time.toISOString(),
    data_time: front.at(-1)?.time ?? null,
    wind,
    wind_text: wind
      ? `from the ${compass(wind.from_deg)} at ${wind.speed_kmh} km/h, measured at ${fx.meta.wind_station.name}`
      : "no wind data",
    spread_kmh: wind ? spreadKmh(wind) : null,
    front,
  };
  if (!wind || !front.length)
    return { ...base, zones: [], places: [], counts: { within_1h: 0, within_3h: 0, within_6h: 0 } };

  const maxH = Math.max(...HORIZONS_H);
  const places: PlaceAtRisk[] = [];
  for (const p of fx.places) {
    const e = exposure(p, front, wind);
    if (!e || e.arrival_h === null || e.reason === null) continue;
    // Round once, so counts, ranking, text and instruction always agree.
    const arrival = Math.round(e.arrival_h * 10) / 10;
    if (arrival > maxH) continue;
    places.push({
      ...p,
      distance_km: Math.round(e.distance_km * 10) / 10,
      fire_direction: compass(e.fire_bearing_deg),
      arrival_h: arrival,
      arrival_estimate: arrivalText(arrival),
      reason: e.reason,
      likely_empty: likelyEmpty(p.kind, time),
      instructions: instructionFor(arrival),
    });
  }
  return {
    ...base,
    zones: HORIZONS_H.map((hours) => ({ hours, polygon: zonePolygon(front, wind, hours) })),
    places: rank(places),
    counts: {
      within_1h: places.filter((p) => p.arrival_h <= 1).length,
      within_3h: places.filter((p) => p.arrival_h <= 3).length,
      within_6h: places.length,
    },
  };
}

/** Whole hours from the first satellite detection to the last one: the replay timeline. */
export function replayHours(fx: Fixture): Date[] {
  const first = fx.hotspots[0];
  const last = fx.hotspots.at(-1);
  if (!first || !last) return [];
  const hour = 3_600_000;
  const start = Math.floor(new Date(first.time).getTime() / hour) * hour;
  const out: Date[] = [];
  for (let t = start; t <= new Date(last.time).getTime() + hour; t += hour) out.push(new Date(t));
  return out;
}
