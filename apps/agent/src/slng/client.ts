// Minimal client for the SLNG Agents API (https://docs.slng.ai/llms.txt).
const BASE_URL = "https://api.agents.slng.ai/v1";

export class SlngError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`SLNG API error ${status}: ${body}`);
  }
}

function apiKey(): string {
  const key = process.env.SLNG_API_KEY;
  if (!key) throw new Error("SLNG_API_KEY is not set (see .env.example)");
  return key;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new SlngError(res.status, text);
  return (text ? JSON.parse(text) : {}) as T;
}

export interface AgentConfig {
  name: string;
  system_prompt: string;
  greeting: string;
  outbound_greeting: string;
  language: string;
  region: "us-east" | "eu-central" | "ap-south";
  models: { stt: string; llm: string; tts: string; tts_voice: string };
  template_defaults: Record<string, string>;
}

export interface Agent {
  id: string;
  name: string;
}

export const createAgent = (config: AgentConfig) => request<Agent>("POST", "/agents", config);

export const updateAgent = (id: string, config: Partial<AgentConfig>) =>
  request<Agent>("PATCH", `/agents/${id}`, config);

export interface CallResult {
  call_id: string;
  message: string;
  latency_ms: number;
}

/** Starts an outbound phone call. Callers must check human approval first. */
export async function dispatchCall(
  agentId: string,
  phoneNumber: string,
  args: Record<string, string>,
): Promise<CallResult> {
  if (!/^\+[1-9]\d{6,14}$/.test(phoneNumber)) {
    throw new Error(`Phone number must be E.164 (like +34600000000), got "${phoneNumber}"`);
  }
  const started = performance.now();
  const res = await request<{ call_id: string; message: string }>(
    "POST",
    `/agents/${agentId}/calls`,
    { phone_number: phoneNumber, arguments: args },
  );
  return { ...res, latency_ms: Math.round(performance.now() - started) };
}
