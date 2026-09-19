# Evac Caller: Plan

## The product in one sentence
When a wildfire moves, Evac Caller finds the hospitals, schools and care homes in its path, sends a ranked list to the emergency coordinator on Telegram, and after the coordinator presses **Approve**, an AI voice agent phones each place and tells them what to do.

## What the judges will see (demo, about 3 minutes)
1. A map replays a **real** recent fire in Spain, hour by hour, with real wind. A danger zone grows in the wind direction.
2. Places inside the zone light up. They are ranked by how soon the fire can reach them.
3. The coordinator's phone gets a Telegram message: "3 places at risk. Call them?" with **Approve / Deny** buttons.
4. The coordinator presses **Approve**. A real phone on stage rings. The AI speaks: it names the place, the fire direction and distance, and what to do. The person on the phone can ask questions ("Which road should we use?").
5. The call ends with a result for each place: **confirmed**, **needs help** (for example "we have 12 residents who can't walk") or **no answer**. The dashboard shows it with the transcript and the numbers (latency, model, cost).
6. A place that did not confirm goes back to the coordinator on Telegram: "Residència X: no answer. Call again / escalate to 112?"
7. A judge can text the Telegram bot cold ("Is Hospital X in danger?") and gets a correct answer from the data.

## Our difference (vs. other wildfire projects and existing alert systems)
See `docs/research-existing-solutions.md`. ES-Alert (cell broadcast) tells everyone in an area, one way, with no reply. Everbridge and Genasys use recorded calls with "press 1". **Evac Caller makes sure the specific places with vulnerable people heard, understood and confirmed, and sends every unconfirmed place back to a human.** It works next to ES-Alert and 112, not instead of them.

Other teams (for example `eldtechnologies/hackbarna-wildfire`) focus on the map and the fire simulation. **Our focus is action: human approval, then real phone calls.** The map is simple on purpose.

## Milestones (in risk order: the most risky part first)

Each milestone ends at a **gate**: demo script passes, reviewer agent has checked the code, and the user approves.

### M0: Real phone call (17:45 - 19:30)
The riskiest part. It needs 3 things: SLNG, a Vonage phone number (SIP trunk), and a phone that can receive the call.
- Create an SLNG voice agent with a prompt that uses call arguments (place name, distance, direction, instructions).
- Connect Vonage to SLNG as an outbound SIP connection (SLNG dashboard, manual mode). `pnpm agent:sync` attaches it to the agent. A Vonage trial account can only call its allowed test numbers, so add the stage phone.
- A script `pnpm call:test` calls `POST /v1/agents/{id}/calls` with real arguments, and the phone rings.
- Save the call ID, latency and (if the API gives it) the transcript.

**Acceptance:** the user's phone rings, the agent speaks the given place name in English and answers one question. The script prints the call ID.
**Fallback (decide at 19:30 if it fails):** browser "phone" (web page with microphone) using SLNG STT/TTS. We tell judges the real line is not ready.

### M1: Telegram coordinator bot with approval (19:30 - 22:00)
- Mastra agent on Telegram (Mastra Channels). Model through Nebius.
- A workflow: "places at risk" → message with **Approve / Deny** → the workflow **pauses** until the coordinator answers → on Approve, dispatch the calls (M0 code).
- Memory: remembers the coordinator and the active incident.
- **Call outcome:** after each call, Nebius reads the transcript and classifies it: `CONFIRMED`, `NEEDS_HELP` (with what help, for example number of people who can't walk) or `NO_ANSWER`/`UNCLEAR`. The model must quote the caller's words as evidence. Unknown means `UNCLEAR`, never `CONFIRMED`.
- **Escalation:** every place that is not `CONFIRMED` is sent back to the coordinator on Telegram with buttons: **Call again** / **Mark as escalated to 112**.
- A cold question from a judge ("Is X in danger?") gets a correct answer (at this point from a fixture list; real data comes in M2).

**Acceptance:** from Telegram, Approve makes the phone ring. Deny makes no call. No call is possible without an approval (test). After the call, Telegram shows the outcome with a quote from the call. A missed call comes back as `NO_ANSWER` with the escalation buttons.

### M2: Real fire data and places at risk (22:00 - 01:00)
- First 10 minutes: read `eldtechnologies/hackbarna-wildfire`, so we don't copy its work, and note what's different.
- Choose one real recent fire in Spain (gate: user chooses from 2-3 options). Download NASA FIRMS hotspots for it and save them as a fixture in `data/fixtures/` with the source URL and date.
- Wind: Open-Meteo historical API (free, no key) for the fire area and hours. Save as a fixture.
- Danger zone: a simple wind cone/ellipse from the fire front, for 1h / 3h / 6h. Explain clearly that it is an **estimate**, not a fire simulation.
- Places: hospitals, schools, care homes from OpenStreetMap (Overpass API). Save as a fixture.
- Priority: time until the fire can arrive, then type of place (a care home is harder to evacuate than a school on a Sunday).
- All of this is in `packages/core` with tests.

**Acceptance:** `pnpm replay` prints, for each hour, the places at risk with distance and time estimate. The Telegram bot and the phone agent use these real values.

### Sleep (01:00 - 06:30)

### M3: Map dashboard (06:30 - 09:30)
- **UI gate first:** 2-3 mockups in `docs/mockups/`; the user chooses one.
- Next.js page: map with hotspots, danger zone, places (ranked list), replay slider, call status panel, transcript and numbers.
- Connect to the agent: show live approval and call status.

**Acceptance:** the full demo (steps 1-6 above) works from a fresh browser.

### M4: Evals, code scan, submission (09:30 - 10:45)
- Galtea: test the phone agent and the bot with tricky questions (the problem Cal Fire's chatbot had: refusing to answer evacuation questions, or inventing facts). Find one real problem, fix it, run again, save before/after.
- Norma: scan, fix one finding, scan again.
- README with setup, architecture, data sources and limits. Demo video. Push the public repo. Submit.

**Acceptance:** submission is sent, and the receipt is saved.

## Rules for time
- If a milestone is more than 45 minutes late, stop and ask the user what to cut.
- Nothing new after **09:30 Sunday**. Only fixes.

## Not doing (so we don't waste time)
- Real fire spread simulation (physics).
- Many languages (English only).
- User accounts, login pages, mobile app.
- 3D globe.
