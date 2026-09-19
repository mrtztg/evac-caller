# Evac Caller: rules for Claude Code

Evac Caller finds the places in danger from a wildfire (hospitals, schools, care homes), asks a human coordinator to approve, and then an AI voice agent phones each place. It is built for HackBarna AI Summit 2026. Main sponsor targets: **Norrsken** (wildfire, "values at risk"), **SLNG** (voice agent + phone calls), **Mastra** (Telegram agent with approval). Extra: **Nebius** (LLM), **Galtea** (evals), **Norma** (code scan).

Deadline: **Sunday 20 Sep 2026, 10:45 CEST** (official code submission is 11:00).

## Read these first, every session
1. `docs/PLAN.md`: milestones, acceptance lists, time budget.
2. `docs/PROGRESS.md`: where we are now. **This is the source of truth, not the conversation.**
3. `docs/DECISIONS.md`: decisions the user already made. Never re-ask a decided question.

## How we work
- Work on **one milestone at a time**, in `docs/PLAN.md` order. Use `/milestone` to run the loop.
- The loop is: plan the slice, build, run `scripts/check.sh`, get an independent review (`reviewer` agent), run the demo script (`verifier` agent), then stop at the gate.
- Update `docs/PROGRESS.md` after every finished task (short lines: done / next / blockers).
- Commit small and often with clear messages. Push only at milestone gates.
- When the context gets long, or at the end of a milestone, run `/handoff`: write PROGRESS.md so a fresh session can continue, then tell the user it is safe to `/clear`.

## Decision gates: STOP and ask the user (AskUserQuestion)
Always stop and ask at these points. Give 2-4 options, put your recommendation first, and explain the trade-off in simple words:
1. **UI design.** Before building any screen, make 2-3 static mockups in `docs/mockups/` (HTML files; publish them or take screenshots) and let the user choose.
2. **Architecture or path choice** that is hard to change later (new service, data source, library with big impact, file layout change).
3. **Anything that costs money or needs a new account/credential.**
4. **Marking a milestone done.** Show the demo script result and the reviewer findings first.
5. Something in the plan turns out to be impossible or much harder than expected.

Log every gate answer in `docs/DECISIONS.md` (date, question, options, choice, why).
Do **not** ask about small things (variable names, helper structure, test layout). Decide and move on.

## Anti-slop rules (non-negotiable)
- **Real data only on the demo path.** Fire points, wind, places and the danger zone come from the fixture files or real APIs through `packages/core`. Never hardcode a demo result in the UI or in the agent prompt.
- **No fake sponsor use.** If SLNG, Nebius, Vonage or Galtea is not really called, the UI and logs must say `MOCK` or `REPLAY` clearly. Never present a recording as live.
- **Log real numbers.** Every LLM call (Nebius): model ID, latency, tokens. Every call (SLNG): call ID, latency, duration. Show them in the UI or logs. Sponsors ask for numbers.
- **The human approves before any phone call.** No code path may dispatch a call without a recorded approval. This is a safety rule and a test case.
- **The agent never invents facts.** It only says what the data shows (distance, direction, time). If it doesn't know, it says so and gives the official emergency number (112).
- **Every feature must be visible in the demo** or be a test/check. If a judge won't see it and it doesn't protect the demo, don't build it.
- **No placeholder text, lorem ipsum, fake testimonials, fake stats or "coming soon" buttons.** No generic AI-dashboard look; follow the chosen mockup.
- **Small, readable code.** No unused abstractions, no "manager/factory" layers, no dead code. Match surrounding style.
- **Secrets only in `.env`** (git-ignored). Only variable names go in `.env.example`. Never print keys in logs or commit them.
- **Use current docs.** Mastra, SLNG and Next.js APIs change fast. Check docs (context7, `https://docs.slng.ai/llms.txt`) before writing integration code. Don't trust memory.

## Stack
- pnpm workspace, TypeScript everywhere, Node 22.
- `packages/core`: pure logic (fire replay, wind, danger zone, places at risk, priority). Vitest tests. No network in tests; use `data/fixtures`.
- `apps/agent`: Mastra agent + Telegram channel + tools (approval, dispatch call).
- `apps/web`: Next.js dashboard with a map (built in M3 after the UI gate).
- Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, all run by `scripts/check.sh`.

## Language
User-facing docs (README, PLAN, PROGRESS, DECISIONS, questions to the user) are written in simple B1-B2 English: short full sentences, common words, explain technical words. The phone agent speaks English.
