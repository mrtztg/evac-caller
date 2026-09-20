// What happened on the phone line, written by the Telegram bot and read by the dashboard.
// One JSON object per line, append only, so both sides can restart without losing the demo.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runtimeDir } from "./paths.js";

/** The hour the demo starts on: the first hour with a large front (197 hotspots) and strong westerly wind. */
export const DEFAULT_REPLAY_TIME = "2026-07-25T14:00:00.000Z";

export type CallStatus = "CONFIRMED" | "NEEDS_HELP" | "NO_ANSWER" | "UNCLEAR";

export interface LlmNumbers {
  model: string;
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
}

interface Base {
  /** When the bot wrote the line, ISO UTC. */
  time: string;
  place_id: string;
  place_name: string;
}

export type CallEvent =
  | (Base & {
      type: "call_started";
      call_id: string;
      /** How long the SLNG dispatch call took, ms. */
      api_latency_ms: number;
      approved_by: string;
      approved_at: string;
    })
  | (Base & {
      type: "call_outcome";
      call_id: string;
      status: CallStatus;
      /** The caller's own words, checked against the transcript. Null if they said nothing. */
      evidence_quote: string | null;
      help_needed: string | null;
      reason: string;
      duration_s: number | null;
      /** Average voice-agent latency for this call, seconds. */
      latency_s: {
        e2e_avg: number | null;
        llm_ttft_avg: number | null;
        tts_ttfb_avg: number | null;
      };
      transcript: { speaker: "agent" | "caller"; text: string }[];
      /** Null when no model was needed (nobody spoke). */
      llm: LlmNumbers | null;
    })
  | (Base & { type: "call_failed"; error: string })
  | (Base & { type: "escalated"; action: "call_again" | "escalated_112"; by: string });

const eventsFile = () => join(runtimeDir(), "call-events.jsonl");
const replayFile = () => join(runtimeDir(), "replay-time.txt");

function ensureDir() {
  mkdirSync(runtimeDir(), { recursive: true });
}

export function appendEvent(event: CallEvent): void {
  ensureDir();
  appendFileSync(eventsFile(), `${JSON.stringify(event)}\n`, "utf8");
}

/** All events so far, oldest first. A half-written last line is skipped, not thrown. */
export function readEvents(): CallEvent[] {
  let text: string;
  try {
    text = readFileSync(eventsFile(), "utf8");
  } catch {
    return [];
  }
  const out: CallEvent[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as CallEvent);
    } catch {
      // The bot may be writing this line right now; it will be complete on the next read.
    }
  }
  return out;
}

/** The hour the dashboard slider is showing. The bot replays the same hour, so both agree. */
export function readReplayTime(): string | null {
  try {
    const value = readFileSync(replayFile(), "utf8").trim();
    return Number.isNaN(new Date(value).getTime()) ? null : value;
  } catch {
    return null;
  }
}

export function writeReplayTime(iso: string): void {
  if (Number.isNaN(new Date(iso).getTime())) throw new Error(`not a date: ${iso}`);
  ensureDir();
  writeFileSync(replayFile(), `${iso}\n`, "utf8");
}
