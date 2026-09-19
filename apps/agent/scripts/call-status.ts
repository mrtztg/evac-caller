// Shows a call's status, transcript and latency. Usage: pnpm call:status <call_id> [--raw] [--outcome]
import { NEBIUS_MODEL } from "../src/bot/model.js";
import { classifyCall } from "../src/bot/outcome.js";
import { summarizeCall } from "../src/slng/call-summary.js";
import { getCall } from "../src/slng/client.js";

const agentId = process.env.SLNG_AGENT_ID;
const callId = process.argv[2];
if (!agentId || !callId) {
  console.error(
    "Usage: pnpm call:status <call_id> [--raw] [--outcome]  (needs SLNG_AGENT_ID in .env)",
  );
  process.exit(1);
}

const call = await getCall(agentId, callId);
if (process.argv.includes("--raw")) {
  console.log(JSON.stringify(call, null, 2));
} else {
  const s = summarizeCall(call);
  console.log(
    `${s.id}  ${s.status}  ${s.duration_s ?? "-"} s  (${s.end_reason ?? "no end reason"})`,
  );
  for (const t of s.turns) {
    const lat = t.e2e_latency_s === null ? "" : `  [${t.e2e_latency_s.toFixed(2)} s]`;
    console.log(`${t.role === "assistant" ? "AGENT" : "CALLER"}: ${t.text}${lat}`);
  }
  console.log(`latency avg (s): ${JSON.stringify(s.latency_s)}`);
  if (process.argv.includes("--outcome")) {
    console.log(`outcome: ${JSON.stringify(await classifyCall(s, NEBIUS_MODEL), null, 2)}`);
  }
}
