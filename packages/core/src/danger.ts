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
/** Older wind observations are not used. */
export const WIND_MAX_AGE_H = 3;

const HOUR_MS = 3_600_000;
/** Hotspots closer than this belong to the same fire. Our assumption (VIIRS pixels are ~375 m). */
export const CLUSTER_KM = 3;

/**
 * The fire: the biggest group of hotspots linked by CLUSTER_KM steps, over all passes. Drops isolated
 * detections elsewhere in the box (for example hot kilns in the Castellón tile industry).
 */
export function mainCluster(hotspots: Hotspot[]): Hotspot[] {
  const group = new Array<number>(hotspots.length).fill(-1);
  const sizes: number[] = [];
  for (let i = 0; i < hotspots.length; i++) {
    if (group[i] !== -1) continue;
    const id = sizes.length;
    const queue = [i];
    group[i] = id;
    let size = 0;
    while (queue.length) {
      const a = hotspots[queue.pop() as number] as Hotspot;
      size++;
      hotspots.forEach((b, j) => {
        if (group[j] === -1 && distanceKm(a, b) <= CLUSTER_KM) {
          group[j] = id;
          queue.push(j);
        }
      });
    }
    sizes.push(size);
  }
  const biggest = sizes.indexOf(Math.max(...sizes));
  return hotspots.filter((_, i) => group[i] === biggest);
}

/** Latest wind observation at or before `time` (the replay must not see the future). */
export function windAt(wind: WindObs[], time: Date): WindObs | null {
  let best: WindObs | null = null;
  for (const w of wind) if (new Date(w.time) <= time) best = w;
  // Calm or variable hours have no direction; an old direction must not be used silently.
  if (best && time.getTime() - new Date(best.time).getTime() > WIND_MAX_AGE_H * HOUR_MS)
    return null;
  return best;
}

/** Hotspots of the latest satellite passes seen at `time`: the fire as the coordinator knows it then. */
export function activeFront(hotspots: Hotspot[], time: Date): Hotspot[] {
  const seen = hotspots.filter((h) => new Date(h.time) <= time);
  if (!seen.length) return [];
  const last = Math.max(...seen.map((h) => new Date(h.time).getTime()));
  const from = last - FRONT_WINDOW_H * HOUR_MS;
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
  let upwind: Hotspot | null = null;
  let upwindKm = Number.POSITIVE_INFINITY;
  for (const h of front) {
    const d = distanceKm(h, place);
    if (d < nearestKm) [nearest, nearestKm] = [h, d];
    if (d < upwindKm && angleDiff(bearingDeg(h, place), downwind(wind)) <= CONE_HALF_ANGLE_DEG)
      [upwind, upwindKm] = [h, d];
  }
  // Near places use the head-fire rate too: faster than a flank fire, so the estimate errs on the safe side.
  const reason = nearestKm <= NEAR_KM ? "near" : upwind ? "downwind" : null;
  // Distance and direction come from the same hotspot as the arrival time.
  const source = reason === "downwind" ? (upwind as Hotspot) : nearest;
  const km = reason === "downwind" ? upwindKm : nearestKm;
  return {
    distance_km: km,
    fire_bearing_deg: bearingDeg(place, source),
    arrival_h: reason ? km / rate : null,
    reason,
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
