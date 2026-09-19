// M0 test: rings TEST_PHONE_NUMBER with the evac agent.
// The arguments are a labelled TEST call, not a real incident. Real values come from packages/core in M2.
import os from "node:os";
import { type Approval, dispatchCall } from "../src/slng/client.js";
import { type CallArguments, evacAgentConfig, PROMPT_VERSION } from "../src/slng/evac-agent.js";

const agentId = process.env.SLNG_AGENT_ID;
const phone = process.env.TEST_PHONE_NUMBER;
if (!agentId || !phone) {
  console.error("Set SLNG_AGENT_ID and TEST_PHONE_NUMBER in .env (run `pnpm agent:sync` first).");
  process.exit(1);
}

const args: CallArguments = {
  place_name: "TEST CALL, Test Care Home",
  place_type: "care home (THIS IS A TEST CALL)",
  incident_name: "System test, no real fire",
  fire_distance_km: "4",
  fire_direction: "north-west",
  arrival_estimate: "about 2 hours",
  wind: "from the north-west at 25 km/h",
  instructions: "This is only a test. In a real call, this line would say to start evacuation.",
  data_time: new Date().toISOString(),
};

// Running this script by hand is the operator's approval; it is recorded in the output.
const approval: Approval = {
  approvedBy: `cli:${os.userInfo().username}`,
  approvedAt: new Date().toISOString(),
  channel: "cli",
};
const result = await dispatchCall(agentId, phone, args, approval);
console.log(
  JSON.stringify(
    {
      mode: "LIVE",
      prompt_version: PROMPT_VERSION,
      models: evacAgentConfig.models,
      to: phone,
      approval,
      ...result,
    },
    null,
    2,
  ),
);
