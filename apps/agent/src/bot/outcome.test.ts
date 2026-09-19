import { describe, expect, it } from "vitest";
import type { CallSummary } from "../slng/call-summary.js";
import { checkEvidence, type LlmOutcome, outcomeWithoutLlm } from "./outcome.js";

const summary = (turns: CallSummary["turns"]): CallSummary => ({
  id: "c1",
  status: "completed",
  duration_s: 40,
  end_reason: "timeout",
  turns,
  latency_s: { e2e_avg: null, llm_ttft_avg: null, tts_ttfb_avg: null },
});
const agentOnly = summary([
  { role: "assistant", text: "Do you confirm? Yes, we confirm.", e2e_latency_s: null },
  { role: "user", text: "   ", e2e_latency_s: null },
]);
const callers = ["Yes, we understood. We will leave now.", "We have 12 residents who can't walk."];
const raw = (o: Partial<LlmOutcome>): LlmOutcome => ({
  status: "CONFIRMED",
  evidence_quote: "",
  help_needed: "",
  reason: "r",
  ...o,
});

describe("outcomeWithoutLlm", () => {
  it("is NO_ANSWER when the caller never spoke, even if the agent said 'confirm'", () => {
    expect(outcomeWithoutLlm(agentOnly)?.status).toBe("NO_ANSWER");
    expect(outcomeWithoutLlm(agentOnly)?.evidence_quote).toBeNull();
  });

  it("leaves calls with caller speech to the model", () => {
    const s = summary([{ role: "user", text: "Hello?", e2e_latency_s: null }]);
    expect(outcomeWithoutLlm(s)).toBeNull();
  });
});

describe("checkEvidence", () => {
  it("keeps CONFIRMED when the quote is in the caller's words (case and punctuation ignored)", () => {
    const o = checkEvidence(raw({ evidence_quote: "yes we understood" }), callers, null);
    expect(o.status).toBe("CONFIRMED");
  });

  it("downgrades CONFIRMED to UNCLEAR when the quote is invented", () => {
    const o = checkEvidence(raw({ evidence_quote: "We are all safe" }), callers, null);
    expect(o).toMatchObject({ status: "UNCLEAR", evidence_quote: null });
  });

  it("downgrades CONFIRMED to UNCLEAR when there is no quote", () => {
    expect(checkEvidence(raw({}), callers, null).status).toBe("UNCLEAR");
  });

  it("keeps NEEDS_HELP with a real quote and a help need", () => {
    const o = checkEvidence(
      raw({
        status: "NEEDS_HELP",
        evidence_quote: "12 residents who can't walk",
        help_needed: "12 residents cannot walk",
      }),
      callers,
      null,
    );
    expect(o).toMatchObject({ status: "NEEDS_HELP", help_needed: "12 residents cannot walk" });
  });

  it("downgrades NEEDS_HELP without a help need", () => {
    const o = checkEvidence(
      raw({ status: "NEEDS_HELP", evidence_quote: "12 residents" }),
      callers,
      null,
    );
    expect(o.status).toBe("UNCLEAR");
  });

  it("turns the model's NO_ANSWER into UNCLEAR when the caller did speak", () => {
    expect(checkEvidence(raw({ status: "NO_ANSWER" }), callers, null).status).toBe("UNCLEAR");
  });
});
