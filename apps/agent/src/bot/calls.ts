// After approval: phone each place in order, wait for the call to end, classify it, report to Telegram.
import { type ActionEvent, Actions, Button, Card, CardText } from "chat";
import { summarizeCall } from "../slng/call-summary.js";
import { type Approval, type CallRecord, dispatchCall, getCall } from "../slng/client.js";
import { callArguments, type Incident, type PlaceAtRisk } from "./incident.js";
import { classifyCall, type Outcome } from "./outcome.js";

/** The Telegram chat where the approval happened; results go back there. */
export type Thread = NonNullable<ActionEvent["thread"]>;

const POLL_MS = 5_000;
const CALL_TIMEOUT_MS = 8 * 60_000;
// The transcript can arrive a few seconds after the call ends.
const REPORT_WAIT_MS = 30_000;
const FINAL_STATUSES = new Set([
  "completed",
  "failed",
  "no_answer",
  "no-answer",
  "busy",
  "canceled",
  "cancelled",
  "error",
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const isApproval = (a: unknown): a is Approval =>
  typeof a === "object" &&
  a !== null &&
  typeof (a as Approval).approvedBy === "string" &&
  typeof (a as Approval).approvedAt === "string";

async function waitForEnd(agentId: string, callId: string): Promise<CallRecord> {
  const deadline = Date.now() + CALL_TIMEOUT_MS;
  let call = await getCall(agentId, callId);
  while (!call.call_ended_at && !FINAL_STATUSES.has(call.status)) {
    if (Date.now() > deadline) throw new Error(`call ${callId} still ${call.status} after 8 min`);
    await sleep(POLL_MS);
    call = await getCall(agentId, callId);
  }
  const reportDeadline = Date.now() + REPORT_WAIT_MS;
  while (
    call.status === "completed" &&
    !call.livekit_session_report &&
    Date.now() < reportDeadline
  ) {
    await sleep(POLL_MS);
    call = await getCall(agentId, callId);
  }
  return call;
}

const ICON: Record<Outcome["status"], string> = {
  CONFIRMED: "✅",
  NEEDS_HELP: "🆘",
  NO_ANSWER: "📵",
  UNCLEAR: "❓",
};

function outcomeText(place: PlaceAtRisk, o: Outcome, callId: string, durationS: number | null) {
  const lines = [`${ICON[o.status]} ${o.status}: ${place.name}`];
  if (o.evidence_quote) lines.push(`Caller said: "${o.evidence_quote}"`);
  if (o.help_needed) lines.push(`Help needed: ${o.help_needed}`);
  lines.push(o.reason);
  const llm = o.llm
    ? `classifier ${o.llm.model}, ${o.llm.latency_ms} ms, ${o.llm.input_tokens ?? "?"}+${o.llm.output_tokens ?? "?"} tokens`
    : "no model needed";
  lines.push(`call ${callId} · ${durationS ?? "?"} s · ${llm}`);
  return lines.join("\n");
}

async function callOne(
  thread: Thread,
  incident: Incident,
  place: PlaceAtRisk,
  approval: Approval,
  model: string,
) {
  const agentId = process.env.SLNG_AGENT_ID;
  const phone = process.env.TEST_PHONE_NUMBER;
  if (!agentId || !phone) throw new Error("SLNG_AGENT_ID and TEST_PHONE_NUMBER must be set");

  const res = await dispatchCall(agentId, phone, callArguments(incident, place), approval);
  console.log(JSON.stringify({ event: "call_dispatched", place: place.id, approval, ...res }));
  await thread.post(
    `📞 LIVE call (replayed fire data) to ${place.name} (rings the demo phone). call ${res.call_id}, API ${res.latency_ms} ms`,
  );

  const call = await waitForEnd(agentId, res.call_id);
  const summary = summarizeCall(call);
  const outcome = await classifyCall(summary, model);
  console.log(
    JSON.stringify({ event: "call_outcome", place: place.id, call_id: call.id, outcome }),
  );
  const text = outcomeText(place, outcome, call.id, summary.duration_s);
  if (outcome.status === "CONFIRMED") {
    await thread.post(text);
    return;
  }
  await thread.post(escalationCard(text, place));
}

/** Every place that did not confirm goes back to the coordinator with these two choices. */
const escalationCard = (text: string, place: PlaceAtRisk) =>
  Card({
    children: [
      CardText(text),
      Actions([
        Button({ id: "call_again", value: place.id, label: "Call again", style: "primary" }),
        Button({ id: "escalate_112", value: place.id, label: "Escalated to 112", style: "danger" }),
      ]),
    ],
  });

// One demo phone line: calls never overlap, even across approvals.
let line: Promise<void> = Promise.resolve();

/** Queues approved calls on the line. Returns at once; results are posted to the thread. */
export function queueCalls(
  thread: Thread,
  incident: Incident,
  places: PlaceAtRisk[],
  approval: Approval,
  model: string,
) {
  for (const place of places) {
    line = line.then(() =>
      callOne(thread, incident, place, approval, model).catch(async (err) => {
        console.error(`call to ${place.id} failed:`, err);
        const text = `⚠️ UNCLEAR: call to ${place.name} failed: ${(err as Error).message}`;
        await thread.post(escalationCard(text, place)).catch(() => {});
      }),
    );
  }
}
