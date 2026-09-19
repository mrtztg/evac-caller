import { describe, expect, it, vi } from "vitest";
import { dispatchCall } from "./client.js";

describe("dispatchCall", () => {
  it("rejects a phone number that is not E.164 before calling the API", async () => {
    process.env.SLNG_API_KEY = "test";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(dispatchCall("agent", "600 000 000", {})).rejects.toThrow(/E\.164/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends phone_number and arguments and reports latency", async () => {
    process.env.SLNG_API_KEY = "test";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ call_id: "c1", message: "Call dispatched successfully" })),
      );
    const res = await dispatchCall("a1", "+34600000000", { place_name: "X" });
    expect(res.call_id).toBe("c1");
    expect(res.latency_ms).toBeGreaterThanOrEqual(0);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.agents.slng.ai/v1/agents/a1/calls");
    expect(JSON.parse(String(init?.body))).toEqual({
      phone_number: "+34600000000",
      arguments: { place_name: "X" },
    });
  });
});
