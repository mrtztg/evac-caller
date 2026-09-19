import { describe, expect, it } from "vitest";
import { summarizeCall } from "./call-summary.js";
import type { CallRecord } from "./client.js";

const base: CallRecord = {
  id: "c1",
  phone_number: "+34600000000",
  status: "completed",
  arguments: {},
  call_started_at: null,
  call_ended_at: null,
  call_duration_ms: 51554,
  call_end_reason: "participant disconnected",
  error_message: null,
};

describe("summarizeCall", () => {
  it("extracts turns in order and averages latency", () => {
    const call: CallRecord = {
      ...base,
      livekit_session_report: {
        events: [
          { item: { type: "agent_handoff" } },
          { item: { type: "message", role: "system", content: ["internal"], metrics: {} } },
          {
            item: {
              type: "message",
              role: "assistant",
              content: ["Hello"],
              metrics: { tts_node_ttfb: 0.2 },
            },
          },
          { item: { type: "message", role: "user", content: ["Which road?"], metrics: {} } },
          {
            item: {
              type: "message",
              role: "assistant",
              content: ["I don't have that information. Call 112."],
              metrics: { e2e_latency: 2, llm_node_ttft: 0.7, tts_node_ttfb: 0.3 },
            },
          },
        ],
      },
    };
    const s = summarizeCall(call);
    expect(s.duration_s).toBe(51.554);
    expect(s.turns.map((t) => t.role)).toEqual(["assistant", "user", "assistant"]);
    expect(s.turns[2]?.text).toContain("112");
    expect(s.latency_s).toEqual({ e2e_avg: 2, llm_ttft_avg: 0.7, tts_ttfb_avg: 0.25 });
  });

  it("works while the call has no report yet", () => {
    const s = summarizeCall({
      ...base,
      status: "in_progress",
      call_duration_ms: null,
      livekit_session_report: null,
    });
    expect(s.turns).toEqual([]);
    expect(s.latency_s.e2e_avg).toBeNull();
    expect(s.duration_s).toBeNull();
  });
});
