import { describe, expect, it } from "vitest";
import { callArguments, loadIncident } from "./incident.js";

describe("incident from the real fire replay", () => {
  it("is labelled as a replay and gives the phone agent only non-empty facts", () => {
    const incident = loadIncident();
    expect(incident.source).toMatch(/^REPLAY/);
    expect(incident.places.length).toBeGreaterThan(0);
    const args = callArguments(incident, incident.places[0]!);
    for (const [key, value] of Object.entries(args)) expect(value, key).not.toBe("");
    expect(args.data_time).toMatch(/Spanish time$/);
    // A replay must never sound like a live fire on the phone.
    expect(args.call_context).toMatch(/exercise, not a real emergency/);
  });
});
