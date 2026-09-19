// Coordinator bot: Mastra agent on Telegram (polling, no public URL needed). Run: pnpm bot
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import type { ActionEvent } from "chat";
import type { Approval } from "../slng/client.js";
import { queueCalls } from "./calls.js";
import { loadIncident } from "./incident.js";
import { NEBIUS_MODEL } from "./model.js";
import { APPROVAL_KEY, createCallPlacesTool, placesAtRiskTool, THREAD_KEY } from "./tools.js";

export const BOT_PROMPT_VERSION = "coordinator-v2";

const INSTRUCTIONS = `You are Evac Caller, the assistant of a wildfire emergency coordinator, on Telegram.

- For any question about the fire, places, danger, distances or times, call places_at_risk first and answer ONLY from its data. Say the data time and that arrival times are estimates. Mention the data source if it says it is a test fixture.
- fire_direction is where the fire is, seen from the place. Say it like "the fire is 4 km to the north-west of Test Care Home". Never turn it around.
- If the data does not answer the question, say you don't know, and give the emergency number 112. Never guess or invent places, roads, distances or times.
- When the coordinator asks to alert, check or call the places at risk: call places_at_risk, list the places ranked (name, type, fire distance and direction, arrival estimate) in a short message, then call call_places with all their ids in ranked order. The coordinator then sees Approve / Deny buttons. Never say a call happened before call_places returns.
- If call_places is denied, say clearly that no calls were made.
- Keep answers short: this is read on a phone during an emergency. Plain text, no tables.`;

const approvalFrom = (event: ActionEvent): Approval => ({
  approvedBy: `telegram:${event.user.userId} (${event.user.fullName || event.user.userName})`,
  approvedAt: new Date().toISOString(),
  channel: "telegram",
});

const coordinator = new Agent({
  id: "coordinator",
  name: "Evac Caller coordinator",
  instructions: INSTRUCTIONS,
  model: `nebius/${NEBIUS_MODEL}`,
  memory: new Memory(),
  tools: { places_at_risk: placesAtRiskTool, call_places: createCallPlacesTool(NEBIUS_MODEL) },
  channels: {
    // hidden: no raw tool JSON in the chat. Approve / Deny cards are still shown (checked in Mastra source).
    adapters: {
      telegram: { adapter: createTelegramAdapter({ mode: "polling" }), toolDisplay: "hidden" },
    },
    handlers: {
      onAction: async (event, defaultHandler, ctx) => {
        const approval = approvalFrom(event);
        if (event.actionId.startsWith("tool_approve:")) {
          // The button press is the recorded human approval that call_places requires.
          console.log(JSON.stringify({ event: "approved", action: event.actionId, approval }));
          ctx.requestContext.set(APPROVAL_KEY, approval);
          ctx.requestContext.set(THREAD_KEY, event.thread);
        } else if (event.actionId.startsWith("tool_deny:")) {
          console.log(
            JSON.stringify({ event: "denied", action: event.actionId, by: approval.approvedBy }),
          );
        }
        const thread = event.thread;
        const incident = loadIncident();
        const place = incident.places.find((p) => p.id === event.value);
        if (event.actionId === "call_again" && thread && place) {
          console.log(JSON.stringify({ event: "call_again", place: place.id, approval }));
          await thread.post(`🔁 Call again approved by ${approval.approvedBy}: ${place.name}`);
          queueCalls(thread, incident, [place], approval, NEBIUS_MODEL);
          return;
        }
        if (event.actionId === "escalate_112" && thread && place) {
          console.log(
            JSON.stringify({
              event: "escalated_112",
              place: place.id,
              by: approval.approvedBy,
              at: approval.approvedAt,
            }),
          );
          await thread.post(
            `📟 ${place.name}: marked as escalated to 112 by ${approval.approvedBy} at ${approval.approvedAt}`,
          );
          return;
        }
        await defaultHandler();
      },
    },
  },
});

export const mastra = new Mastra({
  agents: { coordinator },
  storage: new LibSQLStore({ id: "evac", url: "file:./evac.db" }),
});

console.log(`bot: polling Telegram, model nebius/${NEBIUS_MODEL}, prompt ${BOT_PROMPT_VERSION}`);
