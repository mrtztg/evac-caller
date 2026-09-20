// Turns the bot's event lines into one current row per place, newest first.
import type { CallEvent } from "./types";

export interface CallRow {
  place_id: string;
  place_name: string;
  status: "IN_CALL" | "CONFIRMED" | "NEEDS_HELP" | "NO_ANSWER" | "UNCLEAR" | "FAILED";
  time: string;
  call_id: string | null;
  approved_by: string | null;
  api_latency_ms: number | null;
  duration_s: number | null;
  latency_s: {
    e2e_avg: number | null;
    llm_ttft_avg: number | null;
    tts_ttfb_avg: number | null;
  } | null;
  quote: string | null;
  help_needed: string | null;
  reason: string | null;
  llm: {
    model: string;
    latency_ms: number;
    input_tokens: number | null;
    output_tokens: number | null;
  } | null;
  transcript: { speaker: "agent" | "caller"; text: string }[];
  /** What the coordinator did after an unconfirmed call. */
  followed_up: string | null;
}

const blank = (e: CallEvent): CallRow => ({
  place_id: e.place_id,
  place_name: e.place_name,
  status: "IN_CALL",
  time: e.time,
  call_id: null,
  approved_by: null,
  api_latency_ms: null,
  duration_s: null,
  latency_s: null,
  quote: null,
  help_needed: null,
  reason: null,
  llm: null,
  transcript: [],
  followed_up: null,
});

export function callRows(events: CallEvent[]): CallRow[] {
  const rows = new Map<string, CallRow>();
  for (const e of events) {
    const row = rows.get(e.place_id) ?? blank(e);
    row.time = e.time;
    if (e.type === "call_started") {
      // A new call replaces the old result for this place: the card shows the latest attempt.
      Object.assign(row, blank(e), {
        call_id: e.call_id,
        api_latency_ms: e.api_latency_ms,
        approved_by: e.approved_by,
        time: e.time,
      });
    } else if (e.type === "call_outcome") {
      Object.assign(row, {
        status: e.status,
        call_id: e.call_id,
        duration_s: e.duration_s,
        latency_s: e.latency_s,
        quote: e.evidence_quote,
        help_needed: e.help_needed,
        reason: e.reason,
        llm: e.llm,
        transcript: e.transcript,
      });
    } else if (e.type === "call_failed") {
      Object.assign(row, { status: "FAILED", reason: e.error });
    } else {
      row.followed_up =
        e.action === "call_again"
          ? `${e.by} asked for another call`
          : `${e.by} escalated this place to 112`;
    }
    rows.set(e.place_id, row);
  }
  return [...rows.values()].sort((a, b) => b.time.localeCompare(a.time));
}
