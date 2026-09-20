// Everything that happened on the phone line, written by the Telegram bot.
import { readEvents } from "@evac/core";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ events: readEvents() });
}
