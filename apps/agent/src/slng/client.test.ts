import { afterEach, describe, expect, it, vi } from "vitest";
import { type Approval, dispatchCall } from "./client.js";
import type { CallArguments } from "./evac-agent.js";

const args: CallArguments = {
  call_context: "This is a test call, not a real emergency.",
  place_name: "X",
  place_type: "care home",
  incident_name: "I",
  fire_distance_km: "4",
  fire_direction: "north",
  arrival_estimate: "2 hours",
  wind: "north 20 km/h",
  instructions: "Evacuate",
  data_time: "2026-09-19T10:00:00Z",
};
const approval: Approval = {
  approvedBy: "coordinator",
  approvedAt: "2026-09-19T10:01:00Z",
  channel: "cli",
};
const savedKey = process.env.SLNG_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  process.env.SLNG_API_KEY = savedKey;
});

describe("dispatchCall", () => {
  it("never calls the API without a recorded approval", async () => {
    process.env.SLNG_API_KEY = "test";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const noApproval = { approvedBy: "", approvedAt: "", channel: "cli" } as Approval;
    await expect(dispatchCall("a1", "+34600000000", args, noApproval)).rejects.toThrow(/approval/);
    await expect(
      dispatchCall("a1", "+34600000000", args, undefined as unknown as Approval),
    ).rejects.toThrow(/approval/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses a call with empty facts", async () => {
    process.env.SLNG_API_KEY = "test";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      dispatchCall("a1", "+34600000000", { ...args, instructions: " " }, approval),
    ).rejects.toThrow(/instructions/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a phone number that is not E.164 before calling the API", async () => {
    process.env.SLNG_API_KEY = "test";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(dispatchCall("a1", "600 000 000", args, approval)).rejects.toThrow(/E\.164/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends phone_number and arguments and reports latency", async () => {
    process.env.SLNG_API_KEY = "test";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ call_id: "c1", message: "Call dispatched successfully" })),
      );
    const res = await dispatchCall("a1", "+34600000000", args, approval);
    expect(res.call_id).toBe("c1");
    expect(res.latency_ms).toBeGreaterThanOrEqual(0);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.agents.slng.ai/v1/agents/a1/calls");
    expect(JSON.parse(String(init?.body))).toEqual({
      phone_number: "+34600000000",
      arguments: args,
    });
  });
});
