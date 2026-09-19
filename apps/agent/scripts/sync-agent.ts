// Creates the SLNG phone agent, or updates the existing one (by SLNG_AGENT_ID, else by name).
import { createAgent, listAgents, updateAgent } from "../src/slng/client.js";
import { evacAgentConfig, PROMPT_VERSION } from "../src/slng/evac-agent.js";

const existingId =
  process.env.SLNG_AGENT_ID ||
  (await listAgents()).find((a) => a.name === evacAgentConfig.name)?.id;

if (existingId) {
  // The outbound trunk is attached in the SLNG dashboard, so we don't send it here.
  await updateAgent(existingId, evacAgentConfig);
  console.log(`Updated agent ${existingId} (${PROMPT_VERSION})`);
} else {
  const agent = await createAgent(evacAgentConfig);
  console.log(`Created agent ${agent.id} (${PROMPT_VERSION})`);
}
if (!process.env.SLNG_AGENT_ID) {
  console.log(`Add this to .env:  SLNG_AGENT_ID=${existingId ?? "(see above)"}`);
}
