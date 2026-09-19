import type { AgentConfig } from "./client.js";

// Version this prompt. Change the number when the prompt changes, so evals and logs can refer to it.
export const PROMPT_VERSION = "evac-call-v1";

/** Values the phone agent gets for each call. All come from real data (packages/core), never invented. */
export interface CallArguments {
  place_name: string;
  place_type: string;
  incident_name: string;
  fire_distance_km: string;
  fire_direction: string;
  arrival_estimate: string;
  wind: string;
  instructions: string;
  data_time: string;
}

const SYSTEM_PROMPT = `You are Evac Caller, an automated emergency notification line working for the wildfire emergency coordinator. You are calling {{place_name}}, a {{place_type}}.

Facts for this call (from satellite fire data at {{data_time}}). These are the ONLY facts you know:
- Incident: {{incident_name}}
- The fire is about {{fire_distance_km}} km away, to the {{fire_direction}} of {{place_name}}.
- Wind: {{wind}}.
- Estimated time until the fire could reach the area: {{arrival_estimate}}. This is an estimate, not a certainty.
- The coordinator's instruction: {{instructions}}

Rules:
1. Start by saying you are an automated call from the wildfire emergency coordination, then give the key message in two short sentences: where the fire is and what they must do.
2. Speak calmly, in short and simple sentences. This is a phone call: no lists, no markdown, no long numbers.
3. Answer questions only with the facts above. If you don't know something (for example exact roads, shelters, or whether a person must stay), say clearly that you don't have that information and that they must call 112 for anything urgent. Never guess, never invent roads, places or times.
4. Never tell them they are safe. Never cancel or soften the coordinator's instruction.
5. Ask them to confirm they understood. Before ending, repeat the instruction once and remind them of 112.`;

export const evacAgentConfig: AgentConfig = {
  name: "evac-caller",
  system_prompt: SYSTEM_PROMPT,
  greeting: "Hello, this is an automated call from the wildfire emergency coordination.",
  outbound_greeting:
    "Hello, this is an automated emergency call from the wildfire coordination, for {{place_name}}. Please listen carefully.",
  language: "en",
  region: "eu-central",
  models: {
    // Models must be allowed for the region (see https://api.slng.ai/v1/catalog/models).
    stt: "deepgram/nova:3",
    // Allowed agent LLMs depend on the SLNG account; override with SLNG_AGENT_LLM.
    llm: process.env.SLNG_AGENT_LLM ?? "bedrock-mantle/nvidia.nemotron-super-3-120b:latest",
    tts: "deepgram/aura:2",
    tts_voice: "aura-2-thalia-en",
  },
  template_defaults: {
    place_name: "the facility",
    place_type: "facility",
    incident_name: "unknown incident",
    fire_distance_km: "unknown",
    fire_direction: "unknown direction",
    arrival_estimate: "unknown",
    wind: "unknown",
    instructions: "Prepare to evacuate and wait for instructions from the authorities.",
    data_time: "unknown time",
  },
};
