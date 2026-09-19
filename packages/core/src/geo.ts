// Small spherical-earth helpers. Accurate enough for distances of a few tens of km.
export interface Point {
  lat: number;
  lon: number;
}

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function distanceKm(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

/** Direction from a to b, degrees clockwise from north, 0-360. */
export function bearingDeg(a: Point, b: Point): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export function destination(p: Point, bearing: number, km: number): Point {
  const d = km / R_KM;
  const b = rad(bearing);
  const lat = Math.asin(
    Math.sin(rad(p.lat)) * Math.cos(d) + Math.cos(rad(p.lat)) * Math.sin(d) * Math.cos(b),
  );
  const lon =
    rad(p.lon) +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(rad(p.lat)),
      Math.cos(d) - Math.sin(rad(p.lat)) * Math.sin(lat),
    );
  return { lat: deg(lat), lon: deg(lon) };
}

/** Smallest difference between two directions, 0-180. */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

const COMPASS = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
];

export function compass(bearing: number): string {
  return COMPASS[Math.round(bearing / 45) % 8] as string;
}

/** Convex hull (monotone chain), as a closed [lon, lat] ring for maps. */
export function convexHull(points: Point[]): [number, number][] {
  const pts = [...points].sort((a, b) => a.lon - b.lon || a.lat - b.lat);
  if (pts.length < 3) return pts.map((p) => [p.lon, p.lat]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a.lon - o.lon) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lon - o.lon);
  const half = (list: Point[]) => {
    const out: Point[] = [];
    for (const p of list) {
      while (
        out.length >= 2 &&
        cross(out[out.length - 2] as Point, out[out.length - 1] as Point, p) <= 0
      )
        out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  const ring = [...half(pts), ...half([...pts].reverse())];
  return [...ring, ring[0] as Point].map((p) => [p.lon, p.lat]);
}
