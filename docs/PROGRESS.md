# Progress

**Current milestone:** M4 (evals, code scan, submission)
**Status (Sun 14:02, clock time):** M3 **done**. M4 in progress: Galtea dropped at the gate, README and `docs/SUBMISSION.md` ready. Left: Norma scan (user runs it), demo video, submit.
**Nothing is tested with a real phone or a real browser click yet. The list of human tests is `docs/TEST-BEFORE-DEMO.md`. Run it before the demo.**
**Real deadline: Sunday 14:30 CEST.** The times written in PLAN.md and in the M0-M2 notes below are plan times, not clock times; they are about 11 hours ahead of the real clock. Use `date`.

## M3 so far
- UI gate: three mockups in `docs/mockups/`; the user chose **B (`b-map-first.html`)**: full-screen map, floating cards, made for a projector.
- Architecture gate: the bot and the dashboard share two git-ignored files in `data/runtime/`: `call-events.jsonl` (append-only, one JSON line per call event) and `replay-time.txt` (the hour the slider is on). No new server or port.
- `packages/core`: `paths.ts` (finds the repo root from the working directory, so Next.js can read the fixtures too) and `events.ts` (`appendEvent`, `readEvents`, `readReplayTime`, `writeReplayTime`, `DEFAULT_REPLAY_TIME`). 4 new tests.
- `apps/agent`: writes `call_started`, `call_outcome`, `call_failed` and `escalated` events; `loadIncident()` now reads the slider hour first, then `REPLAY_TIME`, then the default.
- `apps/web` (new): Next.js 15 app router. `/api/incident` (any hour), `/api/calls`, `/api/replay-time`. Leaflet + CARTO dark tiles. Map shows the real hotspots, the 1/3/6 h danger zones and a dot per place at risk; the list is the same ranking as `pnpm replay`; the call panel polls every 2 s and shows quote, transcript, call duration, voice latency and classifier model/latency/tokens.
- Verified: `/api/incident` at the default hour returns 197 hotspots, counts 26/67/158 and the same first three places as `pnpm replay`. `scripts/check.sh` is OK (36 tests).
- Next.js needed `resolve.extensionAlias` (`.js` -> `.ts`) because `packages/core` imports with `.js` endings.
- Run it: `pnpm web` (port 3000) next to `pnpm bot`.
- Verifier: every automated step passes; `/api/incident` matches `pnpm replay` character for character. Everything else needs a human.
- Reviewer: PASS, no blockers. 6 majors, all fixed: the `all: unset` button styling, missing `res.ok`/`catch` on the dashboard fetches, `/api/replay-time` crashing on a bad body, `/api/replay-time` accepting any date, the map needing a `setView`, and the big one - moving the slider used to change the facts spoken on the phone for an already-approved place. The calls now use the hour the coordinator was shown (`rememberShownHour`, test in `apps/agent/src/bot/incident.test.ts`).
- Known gap: `rememberShownHour` is one value per bot process, so it assumes one coordinator.
- CARTO basemap tiles now need an API key and watermark every tile, so the map uses plain OpenStreetMap tiles darkened with a CSS filter.

## M2 so far
- Other team (`eldtechnologies/hackbarna-wildfire`, "Ojo de Fuego"): Deepfire API + 3D globe + 5/10/20 km buffer rings, Los Gallardos fire. Ours: FIRMS + measured wind cone + OSM places, then approval and real phone calls. Different fire.
- Wind: METAR from Valencia airport (LEVC, 41 km away) via Iowa Environmental Mesonet. Open-Meteo blocked on venue IP; Meteostat bulk ends March 2026. Same kind of source as decided (measured station wind).
- Danger zone: head-fire spread = 10% of wind speed (Cruz & Alexander 2019), 30° cone, 2 km any-direction buffer, 1/3/6 h. Labelled estimate everywhere.
- Places: 305 named OSM places (212 schools, 25 nurseries, 34 public health centres, 25 care homes, 9 hospitals). Private clinics ("Centro Médico", cosmetic, dental) are not counted. Overpass main server refuses the venue IP; mirrors used. Pensioners' clubs are not counted as care homes.
- FIRMS: only `_NRT` has July 2026 (`_SP` empty, `VIIRS_NOAA21_SP` invalid). Isolated detections (tile kilns near Vila-real) dropped by a 3 km cluster rule.
- 25 Jul 2026 was a Saturday: schools/nurseries marked `likely empty` (weekend; schools also Jul-Aug) and ranked after occupied places.
- At 16:00 local (default replay hour): 26 places ≤1 h, 67 ≤3 h, 158 ≤6 h, including 13 care homes and 4 hospitals in Borriana, Vila-real and Castelló. Bot tool can filter by name/type ("call the care homes").
- Known limit: if an hour has no wind reading younger than 3 h, the hour reports no places at risk (does not happen in this fixture).
- Review fixes: phone prompt v5 says "exercise, not a real emergency, real data from a past fire" (`call_context`, needs `pnpm agent:sync`); private clinics (cosmetic, dental) dropped; low-confidence FIRMS points dropped; ranking = hour band, then occupied, then type; wind older than 3 h not used; distance/direction from the same hotspot as the arrival time.
- Bot prompt v3: top 8 places + total count; calls the top 3 unless the coordinator names places. `REPLAY_TIME` env picks the replayed hour.

## Done
- Repo, rules (CLAUDE.md), plan, reviewer/verifier agents, /milestone /handoff /gate commands, check script + Stop hook.
- SLNG client: `dispatchCall` requires a recorded human `Approval` and non-empty call facts (tests), 15 s timeout.
- `pnpm agent:sync` (creates/updates agent by name, attaches the active outbound trunk), `pnpm call:test`, `pnpm call:status <id>` (transcript + latency).
- Phone prompt v4 (key message in greeting, no invented facts, asks confirmation + help needed, ends the call).
- Research on existing systems: `docs/research-existing-solutions.md`.

## Evidence
- M2 gate (Sun 00:50): human test passed. Telegram answers use the real replay data; "Call the care homes" + Approve rang the demo phone and the agent spoke the exercise wording. Call ID not saved.
- Two bugs found by the human test, both fixed: the bot process was still running M1 code (restart needed after the fixture change), and place lookup matched the whole phrase, so "Residència de Majors in Borriana" found nothing (now word by word).
- Call 1 `a09b5ad8-5144-4a8e-b206-e9af48f3ee1c` (18:51, prompt v1): rang, greeting named the place, 51.5 s, completed. Background talk interrupted the agent for 30 s before the key message. Latency avg: e2e 2.23 s, LLM first token 0.68 s, TTS first audio 0.24 s. Fix: v2 speaks the key message in the greeting.

- Call 2 `987fd3a8-7a7f-4451-a01b-ca133cfb4b4b` (19:35, prompt v3, quiet room): key message in greeting; "Which road?" answered "I do not have information about roads... call 112" (no invention); asked for confirmation and help needed; recorded "I'm fine". 116 s. Latency avg: e2e 1.97 s, LLM 0.81 s, TTS 0.21 s. Issues fixed in v4: robotic "You asked: ..." when it didn't understand; said "End of call" without hanging up.

## M1 (done)
- `pnpm bot`: Mastra agent `coordinator` on Telegram (@evaccallerbot, polling, no public URL), Nebius `deepseek-ai/DeepSeek-V4-Flash-0731` (override `NEBIUS_MODEL`; `gpt-oss-120b` breaks streamed tool calls on Nebius, reproduced 21:40), memory + channel state in local `evac.db` (LibSQL, git-ignored).
- Approval = Mastra tool approval: `call_places` has `requireApproval: true`, Telegram shows Approve / Deny. The Approve click records `Approval` (Telegram user id, name, time) in the request context; the tool refuses without it (test). Chosen over a hand-built workflow: same pause/resume, less code.
- Calls run one after another on one line (demo phone = `TEST_PHONE_NUMBER`, never the real place). After each call: wait for end, classify, post outcome with quote, call id, duration, classifier model/latency/tokens.
- Outcome: no caller speech = `NO_ANSWER` without a model. Else Nebius structured output; code checks the quote is really in the caller's words, else `UNCLEAR`. Tested on real calls: call 2 = CONFIRMED ("yes understood", 1054 ms, 534+229 tokens), call 1 = UNCLEAR.
- Not CONFIRMED → card with **Call again** (new recorded approval) / **Escalated to 112** (logged with who and when).
- Places: now from the M2 replay (the M1 test fixture was removed).

## Next
- M4 (must be finished by 14:30): README and `docs/SUBMISSION.md` are done, `docs/demo-scripts/M4.md` says what to check before submitting. Left: Norma scan (user), demo video (user, recorded while running the test list), fill the three TODO lines in SUBMISSION.md, submit, save the receipt.
- Galtea is **out** (gate, 13:52). The harness built for it (`pnpm ask`, `evals/galtea/`) was reverted, so no dead code. No document may claim a Galtea evaluation.
- Before the demo: run `docs/TEST-BEFORE-DEMO.md` (Telegram, phone, browser clicks). Save the call ID this time.

## Blockers
- None.

## Notes for a fresh session
- Read CLAUDE.md, then PLAN.md, then this file.
- SLNG agent model IDs that work: stt `deepgram/nova:3`, llm `bedrock-mantle/nvidia.nemotron-super-3-120b:latest`, tts `deepgram/aura:2`. The `groq/...` and non-`:latest` IDs are rejected.
- `outbound_greeting` is only allowed after a SIP trunk is attached. Until then it must be `null`.
