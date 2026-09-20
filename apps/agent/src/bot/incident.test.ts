import { describe, expect, it } from "vitest";
import { callArguments, loadIncident, rememberShownHour, shownHour } from "./incident.js";

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

  it("replays the hour the coordinator was shown, even after the dashboard slider moves", () => {
    const shown = loadIncident();
    rememberShownHour(shown.replay_time_iso);
    // The dashboard moves to another hour; the calls must still use the hour above.
    process.env.REPLAY_TIME = "2026-07-25T12:00:00.000Z";
    try {
      const later = loadIncident();
      expect(later.replay_time_iso).not.toBe(shown.replay_time_iso);
      const forCalls = loadIncident(shownHour() ?? undefined);
      expect(forCalls.replay_time_iso).toBe(shown.replay_time_iso);
      expect(forCalls.counts).toEqual(shown.counts);
    } finally {
      process.env.REPLAY_TIME = undefined;
    }
  });
});
