# Evac Caller

**When a wildfire moves, Evac Caller finds the hospitals, schools and care homes in its path, asks a human coordinator to approve on Telegram, and then an AI voice agent phones each place and records who confirmed.**

Built at HackBarna AI Summit 2026.

## Why

Spain's ES-Alert sends one cell broadcast to everyone in an area. It is one way: nobody knows who read it. Commercial systems (Everbridge, Genasys) place recorded calls with "press 1 to confirm".

Evac Caller is different in one way that matters: **it makes sure the specific places with vulnerable people heard, understood and confirmed, and it sends every place that did not confirm back to a human.** It works next to ES-Alert and 112, not instead of them. Background: `docs/research-existing-solutions.md`.

## What it does

1. Replays a **real** past wildfire hour by hour: La Vall d'Uixó, Castellón, 25-29 July 2026 (about 9,300 ha, more than 50,000 people evacuated or confined in 16 towns).
2. Draws a danger zone from the **measured** wind and lists the hospitals, care homes, health centres, schools and nurseries inside it, ranked by how soon the fire could arrive.
3. Sends the ranked list to the coordinator on Telegram with **Approve / Deny** buttons.
4. After Approve, the SLNG voice agent phones each place in order: it names the place, the distance, the direction of the fire and what to do, and answers questions.
5. Nebius reads the transcript and classifies the call: `CONFIRMED`, `NEEDS_HELP`, `NO_ANSWER` or `UNCLEAR`, quoting the caller's own words as evidence.
6. Anything that is not `CONFIRMED` goes back to the coordinator with **Call again** / **Escalated to 112**.
7. The dashboard shows all of it on a map, with the real latency, model and token numbers.

## Honest labels

- **REPLAY.** The fire, the wind and the places are real, recorded data from July 2026. Nothing is live. The dashboard says `REPLAY` at all times.
- **LIVE calls.** The phone calls are real calls through SLNG and Vonage. Every call **rings the demo phone** (`TEST_PHONE_NUMBER`), never a real hospital or school. The agent opens every call with *"This is an exercise, not a real emergency."*
- **The danger zone is an estimate, not a fire simulation.** Head-fire spread is taken as 10% of the measured wind speed (the "10% rule of thumb": Cruz & Alexander 2019, *Fire* 2(2):23), inside a 30° downwind cone, plus a 2 km any-direction buffer. It is labelled as an estimate everywhere it appears.
- **No call without a human.** `dispatchCall` refuses to run without a recorded `Approval` (Telegram user id, name, time) from the Approve button. There is a test for it.
- **The phone agent does not invent facts.** It says only what the data shows. If it does not know (for example which road to use), it says so and gives 112.

## Run it

```bash
pnpm install
cp .env.example .env    # fill in the keys listed there
pnpm agent:sync         # create or update the SLNG phone agent and attach the SIP trunk
```

Then, in three terminals:

```bash
pnpm replay             # the incident hour by hour, in the terminal
pnpm bot                # the Telegram coordinator agent
pnpm web                # the dashboard on http://localhost:3000
```

Other commands: `pnpm call:test` (ring the demo phone once), `pnpm call:status <call-id>` (transcript and latency), `pnpm data:fetch` (download the fixtures again, needs `FIRMS_MAP_KEY`), `scripts/check.sh` (typecheck, lint, tests).

Demo scripts, step by step, are in `docs/demo-scripts/`.

## Architecture

```
packages/core   pure logic, no network: fire replay, wind, danger zone, places at risk,
                ranking. Vitest tests run against the fixtures.
apps/agent      Mastra agent on Telegram (Mastra Channels) + the SLNG client.
                Approval is a Mastra tool approval, so the call tool pauses until a human
                presses Approve.
apps/web        Next.js dashboard: Leaflet map, replay slider, ranked places, call panel.
data/fixtures   the real recorded data, committed, with the source URL and fetch date.
data/runtime    git-ignored, written while the demo runs:
                call-events.jsonl  one JSON line per call event (bot writes, web reads)
                replay-time.txt    the hour the dashboard slider is on (web writes, bot reads)
```

The bot and the dashboard are separate processes and share only those two files, so either one can restart without breaking the demo.

## Data sources

| What | Source | Fetched |
|---|---|---|
| Fire hotspots | NASA FIRMS, VIIRS (SNPP, NOAA-20, NOAA-21) and MODIS, near-real-time | 2026-09-19 |
| Wind | METAR from Valencia airport (LEVC), Iowa Environmental Mesonet archive | 2026-09-19 |
| Places | OpenStreetMap via Overpass API (© OpenStreetMap contributors, ODbL) | 2026-09-19 |

1,977 hotspots after cleaning: 120 low-confidence detections and 7 isolated detections outside the fire (hot tile kilns near Vila-real) are dropped. 305 named places: 212 schools, 25 nurseries, 34 public health centres, 25 care homes, 9 hospitals. Private clinics (cosmetic, dental, "Centro Médico") are not counted.

At the demo hour (25 July, 16:00 Spanish time): 197 hotspots, wind from the west at 41 km/h, estimated spread 4.1 km/h, **26 places within 1 hour, 67 within 3 hours, 158 within 6 hours.**

## Real numbers from real calls

Two recorded calls through SLNG to the demo phone:

| Call | Result | Duration | Voice latency (avg) |
|---|---|---|---|
| `a09b5ad8-5144-4a8e-b206-e9af48f3ee1c` | rang, greeting named the place; background noise delayed the key message | 51.5 s | end-to-end 2.23 s, LLM first token 0.68 s, TTS first audio 0.24 s |
| `987fd3a8-7a7f-4451-a01b-ca133cfb4b4b` | `CONFIRMED`; asked "Which road should we use?" and the agent correctly refused to guess and gave 112 | 116 s | end-to-end 1.97 s, LLM first token 0.81 s, TTS first audio 0.21 s |

Outcome classification for the second call: Nebius `deepseek-ai/DeepSeek-V4-Flash-0731`, 1054 ms, 534 input + 229 output tokens, evidence quote "yes understood".

The dashboard and the Telegram messages show these numbers for every call.

## Sponsor technologies

- **Norrsken** (wildfire, values at risk): real FIRMS hotspots, measured wind, a labelled danger-zone estimate, and the ranked list of places with vulnerable people.
- **SLNG**: the outbound voice agent and the phone calls (`POST /v1/agents/{id}/calls` over a Vonage SIP trunk).
- **Mastra**: the Telegram coordinator agent, its memory, and the tool approval that holds the call until a human presses Approve.
- **Nebius Token Factory**: the coordinator LLM and the call-outcome classifier.
- **Galtea**: evaluation of the phone agent and the bot (M4).

Note: Vonage supplies the phone line, but Vonage's own prize challenge is for its Video API, so this project does not enter it.

## Limits (what we would fix next)

- The wind station is 41 km from the fire, so local wind in the valleys or a sea breeze can differ from what we use.
- The danger zone is a wind cone, not a fire model: no terrain, no fuel, no firefighting.
- If an hour has no wind reading younger than 3 hours, that hour reports no places at risk rather than guessing.
- "Likely empty" for schools and nurseries is a calendar rule (weekends, July and August), not real occupancy.
- Places and phone numbers come from OpenStreetMap, which is incomplete. Every call in this demo rings the demo phone.
- The dashboard has no login. Anything that can reach port 3000 can move the replay hour, which also moves the hour the bot answers about. Fine for a hackathon laptop, not for real use.
- The calls use the hour the coordinator was shown, so moving the slider after the list appears cannot change what the phone agent says. Only the next list follows the slider.
- English only.
