import { RequestContext } from "@mastra/core/request-context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APPROVAL_KEY, createCallPlacesTool, THREAD_KEY } from "./tools.js";

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
