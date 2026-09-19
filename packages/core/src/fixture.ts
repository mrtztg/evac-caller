// Fixture files for one real fire: satellite hotspots, measured wind, places. Written by scripts/fetch-fixtures.ts.
import { readFileSync } from "node:fs";
import { mainCluster } from "./danger.js";

export interface Source {
  name: string;
  url: string;
  fetched_at: string;
  note?: string;
}

export interface Hotspot {
  lat: number;
  lon: number;
  /** Satellite pass time, ISO UTC. */
  time: string;
  satellite: string;
  /** Fire radiative power, MW. */
  frp: number;
  confidence: string;
}

export interface WindObs {
  /** ISO UTC. */
  time: string;
  /** Degrees the wind blows FROM (meteorological), 0 = north. */
  from_deg: number;
  speed_kmh: number;
  gust_kmh: number | null;
}

export type PlaceKind = "hospital" | "care home" | "school" | "nursery" | "health centre";

export interface Place {
  /** OSM id, for example "way/123". */
  id: string;
  name: string;
  kind: PlaceKind;
  lat: number;
  lon: number;
  town: string | null;
}

export interface FireMeta {
  id: string;
  name: string;
  /** Replay window, ISO UTC. */
  start: string;
  end: string;
  /** Where the wind was measured. */
  wind_station: { id: string; name: string; lat: number; lon: number };
}

export interface Fixture {
  meta: FireMeta;
  sources: Source[];
  /** Hotspots of the fire itself (main cluster). */
  hotspots: Hotspot[];
  /** Low-confidence detections, not used. */
  low_confidence_hotspots: number;
  /** Detections in the box that are not part of the fire. */
  excluded_hotspots: number;
  wind: WindObs[];
  places: Place[];
}

const FIXTURES = new URL("../../../data/fixtures/", import.meta.url);

const read = <T>(fire: string, file: string): T =>
  JSON.parse(readFileSync(new URL(`${fire}/${file}`, FIXTURES), "utf8")) as T;

export function loadFixture(fire: string): Fixture {
  const h = read<{ source: Source; hotspots: Hotspot[] }>(fire, "hotspots.json");
  const w = read<{ source: Source; wind: WindObs[] }>(fire, "wind.json");
  const p = read<{ source: Source; places: Place[] }>(fire, "places.json");
  // Low-confidence VIIRS detections ("l") are dropped: they can grow the front without a real fire.
  const confident = h.hotspots
    // VIIRS uses l/n/h, MODIS a percentage.
    .filter((x) => x.confidence !== "l" && !(Number(x.confidence) < 30))
    .sort((a, b) => a.time.localeCompare(b.time));
  const fireHotspots = mainCluster(confident);
  return {
    meta: read<FireMeta>(fire, "meta.json"),
    sources: [h.source, w.source, p.source],
    hotspots: fireHotspots,
    low_confidence_hotspots: h.hotspots.length - confident.length,
    excluded_hotspots: confident.length - fireHotspots.length,
    wind: w.wind,
    places: p.places,
  };
}

export const DEMO_FIRE = "vall-duixo-2026-07";
