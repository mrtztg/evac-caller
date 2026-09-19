// Downloads the real data for the demo fire and saves it as fixtures. Needs network and FIRMS_MAP_KEY.
// Run: pnpm data:fetch   (the demo and tests only read the saved files)
import { mkdirSync, writeFileSync } from "node:fs";
import type { FireMeta, Hotspot, Place, PlaceKind, Source, WindObs } from "../src/fixture.js";
import { DEMO_FIRE } from "../src/fixture.js";

// La Vall d'Uixó fire, Castellón, started 25 Jul 2026 (see docs/DECISIONS.md).
const FIRE: FireMeta = {
  id: DEMO_FIRE,
  name: "La Vall d'Uixó wildfire, Castellón (July 2026)",
  start: "2026-07-25T00:00:00Z",
  end: "2026-07-29T23:59:59Z",
  // Valencia airport: nearest station with hourly data for July 2026 (41 km south-west of the town).
  wind_station: { id: "LEVC", name: "Valencia airport (METAR)", lat: 39.4867, lon: -0.4733 },
};
// west, south, east, north
const FIRE_BOX = [-0.65, 39.7, -0.05, 40.05] as const;
const PLACES_BOX = [-0.7, 39.65, 0.05, 40.1] as const;
const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const FIRMS_SOURCES = ["VIIRS_SNPP", "VIIRS_NOAA20", "VIIRS_NOAA21", "MODIS"];

const now = new Date().toISOString();
const dir = new URL(`../../../data/fixtures/${DEMO_FIRE}/`, import.meta.url);

// Never print the FIRMS key (it is part of the URL path).
const redact = (url: string) =>
  process.env.FIRMS_MAP_KEY ? url.replaceAll(process.env.FIRMS_MAP_KEY, "<MAP_KEY>") : url;

async function get(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": "evac-caller-hackathon/0.1", ...init?.headers },
    signal: AbortSignal.timeout(180_000),
  });
  const text = await res.text();
  if (!res.ok)
    throw new Error(`${res.status} from ${redact(url.split("?")[0] ?? "")}: ${text.slice(0, 200)}`);
  return text;
}

function csvRows(text: string): Record<string, string>[] {
  const [header, ...lines] = text.trim().split("\n");
  const keys = (header ?? "").split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(keys.map((k, i) => [k, cells[i] ?? ""]));
  });
}

async function fetchHotspots(): Promise<{ hotspots: Hotspot[]; source: Source }> {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key)
    throw new Error(
      "FIRMS_MAP_KEY is missing in .env (free key: https://firms.modaps.eosdis.nasa.gov/api/map_key)",
    );
  const days = 5;
  const date = FIRE.start.slice(0, 10);
  const hotspots: Hotspot[] = [];
  const used: string[] = [];
  for (const sat of FIRMS_SOURCES) {
    // Standard processing (_SP) replaces near-real-time (_NRT) after some weeks. Take whichever has the dates.
    for (const kind of ["SP", "NRT"]) {
      const source = `${sat}_${kind}`;
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${source}/${FIRE_BOX.join(",")}/${days}/${date}`;
      const text = await get(url).catch((err: Error) => `Error: ${err.message}`);
      if (text.startsWith("Invalid") || text.startsWith("Error")) {
        console.log(`${source}: ${text.slice(0, 100).trim()}`);
        continue;
      }
      const rows = csvRows(text);
      console.log(`${source}: ${rows.length} hotspots`);
      if (!rows.length) continue;
      used.push(source);
      for (const r of rows) {
        const hhmm = (r.acq_time ?? "").padStart(4, "0");
        hotspots.push({
          lat: Number(r.latitude),
          lon: Number(r.longitude),
          time: `${r.acq_date}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`,
          satellite: source,
          frp: Number(r.frp),
          confidence: r.confidence ?? "",
        });
      }
      break;
    }
  }
  if (!hotspots.length) throw new Error("FIRMS returned no hotspots for the fire box and dates");
  hotspots.sort((a, b) => a.time.localeCompare(b.time));
  return {
    hotspots,
    source: {
      name: `NASA FIRMS active fire hotspots (${used.join(", ")})`,
      url: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/<MAP_KEY>/<SOURCE>/${FIRE_BOX.join(",")}/${days}/${date}`,
      fetched_at: now,
    },
  };
}

async function fetchWind(): Promise<{ wind: WindObs[]; source: Source }> {
  const s = new Date(FIRE.start);
  // The archive's end day is exclusive: ask for the day after the window.
  const e = new Date(new Date(FIRE.end).getTime() + 86_400_000);
  const url =
    `https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station=${FIRE.wind_station.id}` +
    "&data=drct&data=sknt&data=gust&tz=Etc/UTC&format=onlycomma&missing=M" +
    `&year1=${s.getUTCFullYear()}&month1=${s.getUTCMonth() + 1}&day1=${s.getUTCDate()}` +
    `&year2=${e.getUTCFullYear()}&month2=${e.getUTCMonth() + 1}&day2=${e.getUTCDate()}`;
  const KNOT_KMH = 1.852;
  const wind = csvRows(await get(url))
    // Hourly: the METAR on the hour. Skip calm/variable reports without a direction.
    .filter((r) => r.valid?.endsWith(":00") && r.drct !== "M" && r.sknt !== "M")
    .map((r) => ({
      time: `${r.valid?.replace(" ", "T")}:00Z`,
      from_deg: Number(r.drct),
      speed_kmh: Math.round(Number(r.sknt) * KNOT_KMH),
      gust_kmh: r.gust === "M" ? null : Math.round(Number(r.gust) * KNOT_KMH),
    }));
  console.log(`wind: ${wind.length} hourly observations`);
  return {
    wind,
    source: {
      name: `Measured wind, METAR ${FIRE.wind_station.id}, Iowa Environmental Mesonet archive`,
      url: url.replace(/&year1.*/, ""),
      fetched_at: now,
      note: "Open-Meteo was blocked on the venue network and Meteostat had no 2026 summer data (docs/DECISIONS.md).",
    },
  };
}

function kindOf(t: Record<string, string>): PlaceKind | null {
  if (t.amenity === "hospital") return "hospital";
  if (
    t.amenity === "nursing_home" ||
    (t.amenity === "social_facility" &&
      (["nursing_home", "assisted_living"].includes(t.social_facility ?? "") ||
        // Not "for=senior" alone: that also matches pensioners' clubs, where nobody lives.
        (t.social_facility === "group_home" && t["social_facility:for"] === "senior")))
  )
    return "care home";
  if (t.amenity === "school") return "school";
  if (t.amenity === "kindergarten") return "nursery";
  // Public primary care only. Private clinics (cosmetic, dental, physio) are not places we evacuate first.
  if (
    (t.healthcare === "centre" ||
      (t.amenity === "clinic" &&
        /centr[eo] de salu[dt]|consultori|ambulatori|centro m[eé]dico|centre m[eè]dic/i.test(
          t.name ?? "",
        ))) &&
    !/est[eé]tic|dental|dentist/i.test(t.name ?? "")
  )
    return "health centre";
  return null;
}

async function fetchPlaces(): Promise<{ places: Place[]; source: Source }> {
  const [w, s, e, n] = PLACES_BOX;
  const bbox = `${s},${w},${n},${e}`;
  const query = `[out:json][timeout:90];(
    nwr["amenity"~"^(hospital|clinic|school|kindergarten|nursing_home)$"](${bbox});
    nwr["amenity"="social_facility"](${bbox});
    nwr["healthcare"="centre"](${bbox});
  );out tags center;`;
  let url = "";
  let text = "";
  // The main server rate-limits busy networks (like the venue WiFi); the mirrors have the same data.
  for (url of OVERPASS) {
    try {
      text = await get(url, { method: "POST", body: new URLSearchParams({ data: query }) });
      break;
    } catch (err) {
      console.log(`overpass ${url}: ${(err as Error).message}`);
    }
  }
  if (!text) throw new Error("all Overpass servers failed");
  const data = JSON.parse(text) as {
    elements: {
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }[];
  };
  const places: Place[] = [];
  for (const el of data.elements) {
    const t = el.tags ?? {};
    const kind = kindOf(t);
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    // The phone agent says the name, so unnamed places are skipped.
    if (!kind || !t.name || lat === undefined || lon === undefined) continue;
    places.push({
      id: `${el.type}/${el.id}`,
      name: t.name,
      kind,
      lat,
      lon,
      town: t["addr:city"] ?? null,
    });
  }
  console.log(`places: ${places.length} named (of ${data.elements.length} OSM elements)`);
  return {
    places,
    source: {
      name: "OpenStreetMap via Overpass API (© OpenStreetMap contributors, ODbL)",
      url: `${url}?data=${encodeURIComponent(query.replace(/\s+/g, " "))}`,
      fetched_at: now,
    },
  };
}

const only = process.argv[2];
mkdirSync(dir, { recursive: true });
const save = (file: string, value: unknown) =>
  writeFileSync(new URL(file, dir), `${JSON.stringify(value, null, 1)}\n`);

save("meta.json", FIRE);
if (!only || only === "hotspots") {
  const { hotspots, source } = await fetchHotspots();
  save("hotspots.json", { source, hotspots });
}
if (!only || only === "wind") {
  const { wind, source } = await fetchWind();
  save("wind.json", { source, wind });
}
if (!only || only === "places") {
  const { places, source } = await fetchPlaces();
  save("places.json", { source, places });
}
