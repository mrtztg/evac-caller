// Danger zone: a simple wind cone from the fire front. This is an ESTIMATE, not a fire simulation.
import type { Hotspot, WindObs } from "./fixture.js";
import { angleDiff, bearingDeg, convexHull, destination, distanceKm, type Point } from "./geo.js";

/**
 * Head-fire spread rate as a share of the 10 m wind speed: the "10% rule of thumb" for forest and
 * shrubland fires (Cruz & Alexander 2019, Fire 2(2):23, doi:10.3390/fire2020023).
 */
export const SPREAD_SHARE_OF_WIND = 0.1;
/** Slowest spread we assume, so calm hours still show the fire moving (km/h). Our assumption. */
export const MIN_SPREAD_KMH = 0.5;
/** Half-width of the downwind cone, degrees. Our assumption. */
export const CONE_HALF_ANGLE_DEG = 30;
/** Places this close to the fire are at risk in any direction (flanks, spotting, wind shifts). Our assumption. */
export const NEAR_KM = 2;
export const HORIZONS_H = [1, 3, 6] as const;
/** Hotspots from satellite passes up to this long before the latest pass count as the active front. */
export const FRONT_WINDOW_H = 12;

const HOUR_MS = 3_600_000;

/** Latest wind observation at or before `time` (the replay must not see the future). */
export function windAt(wind: WindObs[], time: Date): WindObs | null {
  let best: WindObs | null = null;
  for (const w of wind) if (new Date(w.time) <= time) best = w;
  return best;
}

/** Hotspots of the latest satellite passes seen at `time`: the fire as the coordinator knows it then. */
export function activeFront(hotspots: Hotspot[], time: Date): Hotspot[] {
  const seen = hotspots.filter((h) => new Date(h.time) <= time);
  const last = seen.at(-1);
  if (!last) return [];
  const from = new Date(last.time).getTime() - FRONT_WINDOW_H * HOUR_MS;
  return seen.filter((h) => new Date(h.time).getTime() >= from);
}

export const spreadKmh = (w: WindObs) =>
  Math.max(SPREAD_SHARE_OF_WIND * w.speed_kmh, MIN_SPREAD_KMH);

/** Direction the wind blows TO. */
const downwind = (w: WindObs) => (w.from_deg + 180) % 360;

export interface Exposure {
  /** Distance to the nearest active hotspot. */
  distance_km: number;
  /** Direction from the place to the nearest hotspot: where the fire is, seen from the place. */
  fire_bearing_deg: number;
  /** Estimated hours until the fire could arrive; null if the place is not in the cone or near. */
  arrival_h: number | null;
  reason: "downwind" | "near" | null;
}

export function exposure(place: Point, front: Hotspot[], wind: WindObs): Exposure | null {
  if (!front.length) return null;
  const rate = spreadKmh(wind);
  let nearest = front[0] as Hotspot;
  let nearestKm = Number.POSITIVE_INFINITY;
  let downwindH = Number.POSITIVE_INFINITY;
  for (const h of front) {
    const d = distanceKm(h, place);
    if (d < nearestKm) [nearest, nearestKm] = [h, d];
    if (angleDiff(bearingDeg(h, place), downwind(wind)) <= CONE_HALF_ANGLE_DEG)
      downwindH = Math.min(downwindH, d / rate);
  }
  // Near places use the head-fire rate too: faster than a flank fire, so the estimate errs on the safe side.
  const nearH = nearestKm <= NEAR_KM ? nearestKm / rate : Number.POSITIVE_INFINITY;
  const arrival = Math.min(downwindH, nearH);
  return {
    distance_km: nearestKm,
    fire_bearing_deg: bearingDeg(place, nearest),
    arrival_h: Number.isFinite(arrival) ? arrival : null,
    reason: !Number.isFinite(arrival) ? null : nearH <= downwindH ? "near" : "downwind",
  };
}

/** Area the fire could reach within `hours` (convex hull of the cone from every hotspot), [lon, lat] ring. */
export function zonePolygon(front: Hotspot[], wind: WindObs, hours: number): [number, number][] {
  const reach = spreadKmh(wind) * hours;
  const to = downwind(wind);
  const points: Point[] = [];
  for (const h of front) {
    points.push(h);
    for (const a of [-CONE_HALF_ANGLE_DEG, 0, CONE_HALF_ANGLE_DEG])
      points.push(destination(h, to + a, reach));
  }
  return convexHull(points);
}
