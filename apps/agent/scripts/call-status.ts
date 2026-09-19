// Shows status, duration and the other fields SLNG returns for a call. Usage: pnpm call:status <call_id>
import { getCall } from "../src/slng/client.js";

const agentId = process.env.SLNG_AGENT_ID;
const callId = process.argv[2];
if (!agentId || !callId) {
  console.error("Usage: pnpm call:status <call_id>  (needs SLNG_AGENT_ID in .env)");
  process.exit(1);
}

const { rendered_prompt: _prompt, arguments: _args, ...call } = await getCall(agentId, callId);
console.log(JSON.stringify(call, null, 2));
