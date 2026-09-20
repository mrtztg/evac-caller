// Coordinator bot: Mastra agent on Telegram (polling, no public URL needed). Run: pnpm bot
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { appendEvent } from "@evac/core";
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import type { ActionEvent } from "chat";
import type { Approval } from "../slng/client.js";
import { queueCalls } from "./calls.js";
import { loadIncident, shownHour } from "./incident.js";
import { NEBIUS_MODEL } from "./model.js";
import { BOT_PROMPT_VERSION, INSTRUCTIONS } from "./prompt.js";
import { APPROVAL_KEY, createCallPlacesTool, placesAtRiskTool, THREAD_KEY } from "./tools.js";

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
        // Same hour as the list the coordinator acted on, so Call again repeats the same facts.
        const incident = loadIncident(shownHour() ?? undefined);
        const place = incident.places.find((p) => p.id === event.value);
        if ((event.actionId === "call_again" || event.actionId === "escalate_112") && !place) {
          // The replay hour changed since the card was sent: say so, never drop the press silently.
          console.error(
            JSON.stringify({
              event: "unknown_place",
              action: event.actionId,
              place: event.value,
              by: approval.approvedBy,
            }),
          );
          await thread?.post(
            `⚠️ ${event.value} is not in the current list of places at risk. Nothing was done. Please act by hand (call 112).`,
          );
          return;
        }
        if (event.actionId === "call_again" && thread && place) {
          console.log(JSON.stringify({ event: "call_again", place: place.id, approval }));
          appendEvent({
            type: "escalated",
            time: new Date().toISOString(),
            place_id: place.id,
            place_name: place.name,
            action: "call_again",
            by: approval.approvedBy,
          });
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
          appendEvent({
            type: "escalated",
            time: new Date().toISOString(),
            place_id: place.id,
            place_name: place.name,
            action: "escalated_112",
            by: approval.approvedBy,
          });
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
