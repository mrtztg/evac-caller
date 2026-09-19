import type { CallRecord } from "./client.js";

export interface Turn {
  role: "assistant" | "user";
  text: string;
  e2e_latency_s: number | null;
}

export interface CallSummary {
  id: string;
  status: string;
  duration_s: number | null;
  end_reason: string | null;
  turns: Turn[];
  latency_s: { e2e_avg: number | null; llm_ttft_avg: number | null; tts_ttfb_avg: number | null };
}

interface MessageItem {
  type?: string;
  role?: string;
  content?: string[] | string;
  metrics?: Record<string, number>;
}

const avg = (xs: number[]) =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null;

/** Turns SLNG's large call record into the transcript and latency numbers we show. */
export function summarizeCall(call: CallRecord): CallSummary {
  const report = call.livekit_session_report as { events?: { item?: MessageItem }[] } | null;
  const messages = (report?.events ?? [])
    .map((e) => e.item)
    .filter((it): it is MessageItem => it?.type === "message");

  const turns: Turn[] = messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    text: Array.isArray(m.content) ? m.content.join(" ") : (m.content ?? ""),
    e2e_latency_s: m.metrics?.e2e_latency ?? null,
  }));
  const metric = (key: string) =>
    messages.map((m) => m.metrics?.[key]).filter((v): v is number => typeof v === "number");

  return {
    id: call.id,
    status: call.status,
    duration_s: call.call_duration_ms === null ? null : call.call_duration_ms / 1000,
    end_reason: call.call_end_reason,
    turns,
    latency_s: {
      e2e_avg: avg(metric("e2e_latency")),
      llm_ttft_avg: avg(metric("llm_node_ttft")),
      tts_ttfb_avg: avg(metric("tts_node_ttfb")),
    },
  };
}
