// The slider sets the replayed hour here, so the Telegram bot answers about the same hour.
import { writeReplayTime } from "@evac/core";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { time?: string };
  if (!body.time) return Response.json({ error: "time is required" }, { status: 400 });
  try {
    writeReplayTime(body.time);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
  return Response.json({ time: body.time });
}
