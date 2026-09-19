// Coordinator bot: Mastra agent on Telegram (polling, no public URL needed). Run: pnpm bot
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

export const NEBIUS_MODEL = process.env.NEBIUS_MODEL || "openai/gpt-oss-120b";

const coordinator = new Agent({
  id: "coordinator",
  name: "Evac Caller coordinator",
  instructions: "You help a wildfire emergency coordinator. Answer briefly.",
  model: `nebius/${NEBIUS_MODEL}`,
  memory: new Memory(),
  channels: {
    adapters: { telegram: createTelegramAdapter({ mode: "polling" }) },
  },
});

export const mastra = new Mastra({
  agents: { coordinator },
  storage: new LibSQLStore({ id: "evac", url: "file:./evac.db" }),
});

console.log(`bot: polling Telegram, model nebius/${NEBIUS_MODEL}`);
