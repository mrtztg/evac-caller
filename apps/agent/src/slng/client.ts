// Minimal client for the SLNG Agents API (https://docs.slng.ai/llms.txt).
import type { CallArguments } from "./evac-agent.js";

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
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  if (!res.ok) throw new SlngError(res.status, text);
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new SlngError(res.status, `invalid JSON: ${text.slice(0, 200)}`);
  }
}

export interface AgentConfig {
  name: string;
  system_prompt: string;
  greeting: string;
  inbound_greeting: string | null;
  outbound_greeting: string | null;
  language: string;
  region: "us-east" | "eu-central" | "ap-south";
  models: { stt: string; llm: string; tts: string; tts_voice: string };
  template_defaults: Record<string, string>;
  sip_outbound_trunk_id?: string | null;
}

export interface Agent {
  id: string;
  name: string;
}

export const listAgents = () => request<Agent[]>("GET", "/agents");

export interface TrunkOption {
  id: string;
  name: string;
  numbers: string[];
  status: string;
  selectable: boolean;
}

export const sipTrunkOptions = (agentId: string) =>
  request<{ inbound: TrunkOption[]; outbound: TrunkOption[] }>(
    "GET",
    `/agents/${agentId}/sip-trunk-options`,
  );

export const createAgent = (config: AgentConfig) => request<Agent>("POST", "/agents", config);

export const updateAgent = (id: string, config: Partial<AgentConfig>) =>
  request<Agent>("PATCH", `/agents/${id}`, config);

/** Call record as returned by SLNG. Only the fields we use are typed; the rest stays available. */
export interface CallRecord {
  id: string;
  phone_number: string;
  status: string;
  arguments: Record<string, string>;
  call_started_at: string | null;
  call_ended_at: string | null;
  call_duration_ms: number | null;
  call_end_reason: string | null;
  error_message: string | null;
  [key: string]: unknown;
}

export const getCall = (agentId: string, callId: string) =>
  request<CallRecord>("GET", `/agents/${agentId}/calls/${callId}`);

export interface CallResult {
  call_id: string;
  message: string;
  latency_ms: number;
}

/** A human decision to place this call. Required by dispatchCall: no approval, no call. */
export interface Approval {
  approvedBy: string;
  approvedAt: string;
  channel: "telegram" | "cli";
}

/** Starts an outbound phone call. Throws before any network request if approval or data is missing. */
export async function dispatchCall(
  agentId: string,
  phoneNumber: string,
  args: CallArguments,
  approval: Approval,
): Promise<CallResult> {
  if (!approval?.approvedBy?.trim() || Number.isNaN(Date.parse(approval.approvedAt))) {
    throw new Error("Refusing to call: no recorded human approval");
  }
  if (!/^\+[1-9]\d{6,14}$/.test(phoneNumber)) {
    throw new Error(`Phone number must be E.164 (like +34600000000), got "${phoneNumber}"`);
  }
  const empty = Object.entries(args)
    .filter(([, v]) => !v?.trim())
    .map(([k]) => k);
  if (empty.length) throw new Error(`Refusing to call: empty call facts: ${empty.join(", ")}`);
  const started = performance.now();
  const res = await request<{ call_id: string; message: string }>(
    "POST",
    `/agents/${agentId}/calls`,
    { phone_number: phoneNumber, arguments: { ...args } },
  );
  return { ...res, latency_ms: Math.round(performance.now() - started) };
}
