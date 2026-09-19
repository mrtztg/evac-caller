// Creates the SLNG phone agent, or updates it if SLNG_AGENT_ID is set.
import { createAgent, updateAgent } from "../src/slng/client.js";
import { evacAgentConfig, PROMPT_VERSION } from "../src/slng/evac-agent.js";

const existingId = process.env.SLNG_AGENT_ID;
if (existingId) {
  // outbound trunk is attached in the SLNG dashboard, so we don't send it here.
  const agent = await updateAgent(existingId, evacAgentConfig);
  console.log(`Updated agent ${agent.id ?? existingId} (${PROMPT_VERSION})`);
} else {
  const agent = await createAgent(evacAgentConfig);
  console.log(`Created agent ${agent.id} (${PROMPT_VERSION})`);
  console.log(`Add this to .env:  SLNG_AGENT_ID=${agent.id}`);
}
