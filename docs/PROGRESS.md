# Progress

**Current milestone:** M2 (real fire data and places at risk)
**Status (23:20):** M2 built. Real FIRMS hotspots (2097 in the fire, 7 isolated detections dropped), wind, OSM places (329). `pnpm replay` works hour by hour. Bot + calls read the replay (default 25 Jul 16:00 Spanish time, `REPLAY_TIME` to change). Demo script `docs/demo-scripts/M2.md`. Next: reviewer, verifier, gate.

## M2 so far
- Other team (`eldtechnologies/hackbarna-wildfire`, "Ojo de Fuego"): Deepfire API + 3D globe + 5/10/20 km buffer rings, Los Gallardos fire. Ours: FIRMS + measured wind cone + OSM places, then approval and real phone calls. Different fire.
- Wind: METAR from Valencia airport (LEVC, 41 km away) via Iowa Environmental Mesonet. Open-Meteo blocked on venue IP; Meteostat bulk ends March 2026. Same kind of source as decided (measured station wind).
- Danger zone: head-fire spread = 10% of wind speed (Cruz & Alexander 2019), 30° cone, 2 km any-direction buffer, 1/3/6 h. Labelled estimate everywhere.
- Places: 329 named OSM places (211 schools, 25 nurseries, 61 health centres, 24 care homes, 8 hospitals). Overpass main server refuses the venue IP; mirrors used. Pensioners' clubs are not counted as care homes.
- FIRMS: only `_NRT` has July 2026 (`_SP` empty, `VIIRS_NOAA21_SP` invalid). Isolated detections (tile kilns near Vila-real) dropped by a 3 km cluster rule.
- 25 Jul 2026 was a Saturday: schools/nurseries marked `likely empty` (weekend; schools also Jul-Aug) and ranked after occupied places.
- At 16:00 local: 31 places ≤1 h (health centres in the town), 74 ≤3 h, 171 ≤6 h, incl. 14 care homes + 3 hospitals in Borriana/Vila-real/Castelló. Bot tool can filter by name/type ("call the care homes").
- Bot prompt v3: top 8 places + total count; calls the top 3 unless the coordinator names places. `REPLAY_TIME` env picks the replayed hour.

## Done
- Repo, rules (CLAUDE.md), plan, reviewer/verifier agents, /milestone /handoff /gate commands, check script + Stop hook.
- SLNG client: `dispatchCall` requires a recorded human `Approval` and non-empty call facts (tests), 15 s timeout.
- `pnpm agent:sync` (creates/updates agent by name, attaches the active outbound trunk), `pnpm call:test`, `pnpm call:status <id>` (transcript + latency).
- Phone prompt v4 (key message in greeting, no invented facts, asks confirmation + help needed, ends the call).
- Research on existing systems: `docs/research-existing-solutions.md`.

## Evidence
- Call 1 `a09b5ad8-5144-4a8e-b206-e9af48f3ee1c` (18:51, prompt v1): rang, greeting named the place, 51.5 s, completed. Background talk interrupted the agent for 30 s before the key message. Latency avg: e2e 2.23 s, LLM first token 0.68 s, TTS first audio 0.24 s. Fix: v2 speaks the key message in the greeting.

- Call 2 `987fd3a8-7a7f-4451-a01b-ca133cfb4b4b` (19:35, prompt v3, quiet room): key message in greeting; "Which road?" answered "I do not have information about roads... call 112" (no invention); asked for confirmation and help needed; recorded "I'm fine". 116 s. Latency avg: e2e 1.97 s, LLM 0.81 s, TTS 0.21 s. Issues fixed in v4: robotic "You asked: ..." when it didn't understand; said "End of call" without hanging up.

## M1 so far
- `pnpm bot`: Mastra agent `coordinator` on Telegram (@evaccallerbot, polling, no public URL), Nebius `deepseek-ai/DeepSeek-V4-Flash-0731` (override `NEBIUS_MODEL`; `gpt-oss-120b` breaks streamed tool calls on Nebius, reproduced 21:40), memory + channel state in local `evac.db` (LibSQL, git-ignored).
- Approval = Mastra tool approval: `call_places` has `requireApproval: true`, Telegram shows Approve / Deny. The Approve click records `Approval` (Telegram user id, name, time) in the request context; the tool refuses without it (test). Chosen over a hand-built workflow: same pause/resume, less code.
- Calls run one after another on one line (demo phone = `TEST_PHONE_NUMBER`, never the real place). After each call: wait for end, classify, post outcome with quote, call id, duration, classifier model/latency/tokens.
- Outcome: no caller speech = `NO_ANSWER` without a model. Else Nebius structured output; code checks the quote is really in the caller's words, else `UNCLEAR`. Tested on real calls: call 2 = CONFIRMED ("yes understood", 1054 ms, 534+229 tokens), call 1 = UNCLEAR.
- Not CONFIRMED → card with **Call again** (new recorded approval) / **Escalated to 112** (logged with who and when).
- Places: `data/fixtures/m1-places-at-risk.json`, clearly labelled test fixture (real data in M2).

## Next (before M1)
- M1 (see docs/PLAN.md): check Mastra docs (context7) for Telegram channel, human approval (suspend/resume workflow), memory, and Nebius as a model provider. Then build in `apps/agent`.
- Needs from user: `TELEGRAM_BOT_TOKEN` (from @BotFather) and `NEBIUS_API_KEY` + `NEBIUS_MODEL` in `.env`.
- Prompt v4 gets its first real test in the first M1 approval call.

## Blockers
- M1 needs Telegram bot token + Nebius key in `.env`.

## Notes for a fresh session
- Read CLAUDE.md, then PLAN.md, then this file.
- SLNG agent model IDs that work: stt `deepgram/nova:3`, llm `bedrock-mantle/nvidia.nemotron-super-3-120b:latest`, tts `deepgram/aura:2`. The `groq/...` and non-`:latest` IDs are rejected.
- `outbound_greeting` is only allowed after a SIP trunk is attached. Until then it must be `null`.
