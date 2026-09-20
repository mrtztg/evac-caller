// The slider sets the replayed hour here, so the Telegram bot answers about the same hour.
import { DEMO_FIRE, loadFixture, replayHours, writeReplayTime } from "@evac/core";

export const dynamic = "force-dynamic";

// Only an hour of this replay may be set: any other time would make the bot say "nothing at risk".
const hours = new Set(replayHours(loadFixture(DEMO_FIRE)).map((d) => d.toISOString()));

export async function POST(request: Request) {
  let body: { time?: string };
  try {
    body = (await request.json()) as { time?: string };
  } catch {
    return Response.json({ error: "the body must be JSON" }, { status: 400 });
  }
  if (!body.time) return Response.json({ error: "time is required" }, { status: 400 });
  if (!hours.has(body.time))
    return Response.json({ error: `${body.time} is not an hour of this replay` }, { status: 400 });
  writeReplayTime(body.time);
  return Response.json({ time: body.time });
}
