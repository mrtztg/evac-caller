// Ask the coordinator bot questions without Telegram, so an eval can score its answers.
// Reads a JSON array of questions on stdin, prints a JSON array of {question, answer, ms}.
// Same prompt, same model and the same places_at_risk tool as `pnpm bot`. The call_places tool is
// left out on purpose: this script must never be able to dispatch a phone call.
import { Agent } from "@mastra/core/agent";
import { NEBIUS_MODEL } from "../src/bot/model.js";
import { BOT_PROMPT_VERSION, INSTRUCTIONS } from "../src/bot/prompt.js";
import { placesAtRiskTool } from "../src/bot/tools.js";

const coordinator = new Agent({
  id: "coordinator-eval",
  name: "Evac Caller coordinator (eval)",
  instructions: INSTRUCTIONS,
  model: `nebius/${NEBIUS_MODEL}`,
  tools: { places_at_risk: placesAtRiskTool },
});

const input = await new Response(process.stdin as unknown as ReadableStream).text();
const questions: string[] = JSON.parse(input);

const answers = [];
for (const question of questions) {
  const started = Date.now();
  const result = await coordinator.generate(question);
  answers.push({
    question,
    answer: result.text,
    ms: Date.now() - started,
    model: NEBIUS_MODEL,
    prompt_version: BOT_PROMPT_VERSION,
  });
  console.error(`asked (${Date.now() - started} ms): ${question}`);
}
console.log(JSON.stringify(answers, null, 2));
