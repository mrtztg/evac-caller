// The replayed incident at one hour: fire front, danger zones, ranked places. Same code as the bot uses.
import {
  activeFront,
  DEFAULT_REPLAY_TIME,
  DEMO_FIRE,
  incidentAt,
  loadFixture,
  readReplayTime,
  replayHours,
} from "@evac/core";

// The fixture is read from disk, so this route must run on the server at request time.
export const dynamic = "force-dynamic";

const fixture = loadFixture(DEMO_FIRE);
const hours = replayHours(fixture).map((d) => d.toISOString());
// How big the fire front was each hour: the bars under the replay slider.
const front_by_hour = hours.map((h) => activeFront(fixture.hotspots, new Date(h)).length);

export function GET(request: Request) {
  // No hour asked for: show the hour the bot is replaying, so both sides agree on the first load.
  const asked =
    new URL(request.url).searchParams.get("t") ?? readReplayTime() ?? DEFAULT_REPLAY_TIME;
  const time = new Date(asked);
  if (Number.isNaN(time.getTime()))
    return Response.json({ error: `not a date: ${asked}` }, { status: 400 });

  const incident = incidentAt(fixture, time);
  return Response.json({
    meta: fixture.meta,
    sources: fixture.sources,
    hours,
    front_by_hour,
    ...incident,
    // zonePolygon gives [lon, lat]; Leaflet wants [lat, lon].
    zones: incident.zones.map((z) => ({
      hours: z.hours,
      polygon: z.polygon.map(([lon, lat]) => [lat, lon] as [number, number]),
    })),
  });
}
