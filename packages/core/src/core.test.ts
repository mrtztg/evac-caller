import { describe, expect, it } from "vitest";
import { activeFront, exposure, mainCluster, NEAR_KM, windAt, zonePolygon } from "./danger.js";
import type { Fixture, Hotspot, Place, WindObs } from "./fixture.js";
import { bearingDeg, compass, destination, distanceKm } from "./geo.js";
import {
  arrivalText,
  incidentAt,
  instructionFor,
  likelyEmpty,
  rank,
  replayHours,
} from "./incident.js";

const FIRE = { lat: 39.82, lon: -0.3 };
const hot = (p: { lat: number; lon: number }, time = "2026-07-25T13:00:00Z"): Hotspot => ({
  ...p,
  time,
  satellite: "TEST",
  frp: 10,
  confidence: "h",
});
// Wind from the west at 40 km/h: the fire moves east at 4 km/h (10% rule).
const WEST_40: WindObs = {
  time: "2026-07-25T12:00:00Z",
  from_deg: 270,
  speed_kmh: 40,
  gust_kmh: null,
};
const place = (id: string, kind: Place["kind"], p: { lat: number; lon: number }): Place => ({
  id,
  name: id,
  kind,
  town: null,
  ...p,
});

describe("geo", () => {
  it("measures distance and direction", () => {
    const east = destination(FIRE, 90, 10);
    expect(distanceKm(FIRE, east)).toBeCloseTo(10, 5);
    expect(bearingDeg(FIRE, east)).toBeCloseTo(90, 0);
    expect(compass(bearingDeg(east, FIRE))).toBe("west");
    expect(compass(350)).toBe("north");
    expect(compass(225)).toBe("south-west");
  });
});

describe("danger zone", () => {
  it("never uses wind from the future", () => {
    const later = { ...WEST_40, time: "2026-07-25T14:00:00Z", from_deg: 90 };
    expect(windAt([WEST_40, later], new Date("2026-07-25T13:30:00Z"))).toBe(WEST_40);
    expect(windAt([WEST_40], new Date("2026-07-25T11:00:00Z"))).toBeNull();
    // Too old: calm hours have no direction, the last direction is not reused.
    expect(windAt([WEST_40], new Date("2026-07-25T16:00:00Z"))).toBeNull();
  });

  it("uses only the latest passes up to the replay time as the front", () => {
    const old = hot(FIRE, "2026-07-24T01:00:00Z");
    const recent = hot(FIRE, "2026-07-25T02:00:00Z");
    const latest = hot(FIRE, "2026-07-25T13:00:00Z");
    const future = hot(FIRE, "2026-07-26T02:00:00Z");
    const front = activeFront([old, recent, latest, future], new Date("2026-07-25T15:00:00Z"));
    expect(front).toEqual([recent, latest]);
  });

  it("puts a downwind place at risk with time = distance / spread rate", () => {
    const e = exposure(destination(FIRE, 90, 8), [hot(FIRE)], WEST_40);
    expect(e?.reason).toBe("downwind");
    expect(e?.arrival_h).toBeCloseTo(2, 2); // 8 km at 4 km/h
    expect(compass(e?.fire_bearing_deg ?? -1)).toBe("west"); // the fire is west of the place
  });

  it("takes distance and direction from the hotspot that sets the arrival time", () => {
    const south = hot(destination(FIRE, 180, 3)); // nearest, but not upwind of the place
    const west = hot(destination(FIRE, 270, 5)); // farther, upwind
    const e = exposure(FIRE, [south, west], WEST_40);
    expect(e?.reason).toBe("downwind");
    expect(e?.distance_km).toBeCloseTo(5, 3);
    expect(compass(e?.fire_bearing_deg ?? -1)).toBe("west");
  });

  it("does not put an upwind or side place at risk unless it is near", () => {
    expect(exposure(destination(FIRE, 270, 5), [hot(FIRE)], WEST_40)?.arrival_h).toBeNull();
    expect(exposure(destination(FIRE, 0, 5), [hot(FIRE)], WEST_40)?.arrival_h).toBeNull();
    const near = exposure(destination(FIRE, 270, NEAR_KM - 0.5), [hot(FIRE)], WEST_40);
    expect(near?.reason).toBe("near");
  });

  it("keeps the main fire and drops isolated detections", () => {
    const fire = [0, 1, 2, 3].map((i) => hot(destination(FIRE, 0, i * 2.5)));
    const kiln = hot(destination(FIRE, 90, 10));
    expect(mainCluster([kiln, ...fire])).toEqual(fire);
  });

  it("zone polygon is closed and reaches downwind", () => {
    const ring = zonePolygon([hot(FIRE)], WEST_40, 3);
    expect(ring[0]).toEqual(ring.at(-1));
    const maxLon = Math.max(...ring.map(([lon]) => lon));
    expect(maxLon).toBeCloseTo(destination(FIRE, 90, 12).lon, 3);
  });
});

describe("incident", () => {
  it("ranks by arrival hour band, then by how hard the place is to evacuate", () => {
    const at = (kind: Place["kind"], h: number) => ({
      ...place(`${kind}-${h}`, kind, FIRE),
      distance_km: 1,
      fire_direction: "west",
      arrival_h: h,
      arrival_estimate: arrivalText(h),
      reason: "downwind" as const,
      likely_empty: null,
      instructions: instructionFor(h),
    });
    const ranked = rank([
      at("school", 1.5),
      at("care home", 1.9),
      at("hospital", 0.8),
      at("nursery", 4),
    ]);
    expect(ranked.map((p) => p.id)).toEqual([
      "hospital-0.8",
      "care home-1.9",
      "school-1.5",
      "nursery-4",
    ]);
  });

  it("puts likely empty places last within the same hour band", () => {
    const p = (id: string, kind: Place["kind"], h: number, empty: string | null) => ({
      ...place(id, kind, FIRE),
      distance_km: 1,
      fire_direction: "west",
      arrival_h: h,
      arrival_estimate: arrivalText(h),
      reason: "downwind" as const,
      likely_empty: empty,
      instructions: instructionFor(h),
    });
    const ranked = rank([
      p("school", "school", 0.5, "weekend"),
      p("clinic", "health centre", 0.9, null),
      p("far clinic", "health centre", 5, null),
    ]);
    expect(ranked.map((x) => x.id)).toEqual(["clinic", "school", "far clinic"]);
  });

  it("knows schools are closed at weekends and in summer, care homes never", () => {
    const saturday = new Date("2026-07-25T14:00:00Z");
    const julyTuesday = new Date("2026-07-21T10:00:00Z");
    const octoberTuesday = new Date("2026-10-20T10:00:00Z");
    expect(likelyEmpty("school", saturday)).toBe("weekend");
    expect(likelyEmpty("nursery", julyTuesday)).toBeNull();
    expect(likelyEmpty("school", julyTuesday)).toBe("school summer holidays");
    expect(likelyEmpty("school", octoberTuesday)).toBeNull();
    expect(likelyEmpty("care home", saturday)).toBeNull();
  });

  it("describes arrival and instruction bands", () => {
    expect(arrivalText(0.4)).toBe("less than 1 hour");
    expect(arrivalText(2.6)).toBe("about 3 hours");
    expect(instructionFor(0.5)).toMatch(/now/);
    expect(instructionFor(5)).toMatch(/Be ready/);
  });

  it("builds the incident from fixture data at a replay time", () => {
    const fx: Fixture = {
      meta: {
        id: "t",
        name: "test",
        start: "2026-07-25T00:00:00Z",
        end: "2026-07-26T00:00:00Z",
        wind_station: { id: "X", name: "Test station", lat: 0, lon: 0 },
      },
      sources: [],
      low_confidence_hotspots: 0,
      excluded_hotspots: 0,
      hotspots: [hot(FIRE), hot(destination(FIRE, 90, 3), "2026-07-26T02:00:00Z")],
      wind: [WEST_40],
      places: [
        place("east-8km", "school", destination(FIRE, 90, 8)),
        place("east-30km", "school", destination(FIRE, 90, 30)),
        place("west-8km", "care home", destination(FIRE, 270, 8)),
      ],
    };
    const inc = incidentAt(fx, new Date("2026-07-25T14:00:00Z"));
    expect(inc.front).toHaveLength(1); // the 26 Jul pass is still in the future
    expect(inc.data_time).toBe("2026-07-25T13:00:00Z");
    expect(inc.wind_text).toBe("from the west at 40 km/h, measured at Test station");
    expect(inc.places.map((p) => p.id)).toEqual(["east-8km"]);
    expect(inc.places[0]).toMatchObject({
      distance_km: 8,
      fire_direction: "west",
      arrival_estimate: "about 2 hours",
    });
    expect(inc.counts).toEqual({ within_1h: 0, within_3h: 1, within_6h: 1 });
    expect(inc.zones.map((z) => z.hours)).toEqual([1, 3, 6]);
    expect(replayHours(fx)[0]?.toISOString()).toBe("2026-07-25T13:00:00.000Z");
  });

  it("has no places at risk before the first detection", () => {
    const fx = {
      hotspots: [hot(FIRE)],
      wind: [WEST_40],
      places: [],
      meta: { wind_station: { name: "x" } },
    };
    expect(incidentAt(fx as unknown as Fixture, new Date("2026-07-25T12:30:00Z")).places).toEqual(
      [],
    );
  });
});
