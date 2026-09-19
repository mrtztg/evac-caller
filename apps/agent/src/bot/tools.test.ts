import { RequestContext } from "@mastra/core/request-context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APPROVAL_KEY, createCallPlacesTool, placesAtRiskTool, THREAD_KEY } from "./tools.js";

afterEach(() => vi.restoreAllMocks());

const run = (requestContext: RequestContext) =>
  createCallPlacesTool("m").execute!({ place_ids: ["way/1"] }, {
    requestContext,
  } as never);

describe("call_places tool", () => {
  it("requires approval in Mastra (Telegram shows Approve / Deny)", () => {
    expect(createCallPlacesTool("m").requireApproval).toBe(true);
  });

  it("never calls without a recorded approval, even if the model calls the tool", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const noApproval = new RequestContext();
    noApproval.set(THREAD_KEY, { post: vi.fn() });
    await expect(run(noApproval)).rejects.toThrow(/approval/);

    const badApproval = new RequestContext();
    badApproval.set(THREAD_KEY, { post: vi.fn() });
    badApproval.set(APPROVAL_KEY, { approvedBy: "x" });
    await expect(run(badApproval)).rejects.toThrow(/approval/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("places_at_risk tool", () => {
  const run = (input: { name?: string; type?: "care home" }) =>
    placesAtRiskTool.execute!(input, {} as never) as Promise<{
      top_places: { name: string; type: string; town: string | null }[];
    }>;

  it("finds places by type and by name without accents", async () => {
    const careHomes = await run({ type: "care home" });
    expect(careHomes.top_places.length).toBeGreaterThan(0);
    expect(careHomes.top_places.every((p) => p.type === "care home")).toBe(true);
    const byName = await run({ name: "residencia de majors" });
    expect(byName.top_places.map((p) => p.name)).toContain("Residència de Majors");
  });
});
