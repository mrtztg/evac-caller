// Creates the SLNG phone agent, or updates the existing one (by SLNG_AGENT_ID, else by name).
// If an active outbound connection exists, it is attached so the agent can place calls.
import { createAgent, listAgents, sipTrunkOptions, updateAgent } from "../src/slng/client.js";
import { evacAgentConfig, OUTBOUND_GREETING, PROMPT_VERSION } from "../src/slng/evac-agent.js";

let agentId =
  process.env.SLNG_AGENT_ID ||
  (await listAgents()).find((a) => a.name === evacAgentConfig.name)?.id;

if (!agentId) {
  agentId = (await createAgent(evacAgentConfig)).id;
  console.log(`Created agent ${agentId}`);
}

const outbound = (await sipTrunkOptions(agentId)).outbound.filter(
  (t) => t.selectable && t.status === "active",
);
const trunk = outbound.find((t) => t.name === evacAgentConfig.name) ?? outbound[0];

// SLNG only accepts a directional greeting when a trunk is attached.
await updateAgent(agentId, {
  ...evacAgentConfig,
  sip_outbound_trunk_id: trunk?.id ?? null,
  outbound_greeting: trunk ? OUTBOUND_GREETING : null,
});
console.log(`Updated agent ${agentId} (${PROMPT_VERSION})`);
console.log(
  trunk
    ? `Outbound line: ${trunk.name} ${trunk.numbers.join(", ")}`
    : "No active outbound connection yet: calls will fail until you add one in the SLNG dashboard.",
);
if (!process.env.SLNG_AGENT_ID) console.log(`Add this to .env:  SLNG_AGENT_ID=${agentId}`);
