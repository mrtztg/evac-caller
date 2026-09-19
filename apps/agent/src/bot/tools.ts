import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { isApproval, queueCalls, type Thread } from "./calls.js";
import { loadIncident } from "./incident.js";

/** Enough for a phone screen; the full ranked list is in the dashboard. */
const LISTED = 8;

export const placesAtRiskTool = createTool({
  id: "places_at_risk",
  description:
    "The active wildfire incident: data source, data time, wind, how many places are at risk per arrival band, and the highest-risk places ranked (occupied places first, then by how soon the fire can reach them).",
  inputSchema: z.object({}),
  execute: async () => {
    const { places, ...incident } = loadIncident();
    return { ...incident, top_places: places.slice(0, LISTED) };
  },
});

/** Set by the Telegram Approve button handler. The tool refuses to run without them. */
export const APPROVAL_KEY = "approval";
export const THREAD_KEY = "thread";

export function createCallPlacesTool(model: string) {
  return createTool({
    id: "call_places",
    description:
      "Phone places at risk with the AI voice agent, one after another, in the given order. The coordinator must approve with the Approve button first.",
    inputSchema: z.object({
      place_ids: z.array(z.string()).min(1).describe("ids from places_at_risk, highest risk first"),
    }),
    requireApproval: true,
    execute: async ({ place_ids }, ctx) => {
      const approval = ctx?.requestContext?.get(APPROVAL_KEY);
      const thread = ctx?.requestContext?.get(THREAD_KEY) as Thread | undefined;
      // Safety rule: no recorded human approval, no call.
      if (!isApproval(approval) || !thread) {
        throw new Error("Refusing to call: no recorded approval from the Telegram Approve button");
      }
      const incident = loadIncident();
      const places = place_ids.map((id) => incident.places.find((p) => p.id === id));
      const unknown = place_ids.filter((_, i) => !places[i]);
      if (unknown.length) throw new Error(`Unknown place ids: ${unknown.join(", ")}`);
      const ordered = places.filter((p) => p !== undefined);
      queueCalls(thread, incident, ordered, approval, model);
      return {
        status: "calls started",
        approved_by: approval.approvedBy,
        order: ordered.map((p) => p.name),
        note: "Every call rings the demo phone, never the real place. Results will be posted here after each call.",
      };
    },
  });
}
