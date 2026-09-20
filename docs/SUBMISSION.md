# Submission text

Copy these blocks into the submission form. Fill the three `TODO` lines first.

- Repo: https://github.com/mrtztg/evac-caller
- Demo video: TODO (link)
- Team: TODO (names)
- Submitted at: TODO (time + receipt saved where)

## Name

Evac Caller

## One line

When a wildfire moves, Evac Caller finds the hospitals, schools and care homes in its path and, after a human approves, an AI voice agent phones each one.

## What it does

A wildfire alert today is one-way. ES-Alert sends a message to every phone in an area. Nobody knows who read it. Commercial systems call people with a recording and ask them to press 1.

Evac Caller does the opposite. It works on the small number of places where evacuation is slow and dangerous: hospitals, care homes, schools and nurseries.

1. It replays a real fire (Vall d'Uixó, Castellón, 25 July 2026) from NASA FIRMS satellite hotspots, hour by hour, with real measured wind from the Valencia airport weather station.
2. It draws an estimated danger zone: a cone in the wind direction for 1, 3 and 6 hours. It is clearly labelled an estimate, not a fire simulation.
3. It finds the places inside that zone from OpenStreetMap and ranks them: soonest arrival first, then places with people inside, then the hardest to evacuate.
4. The coordinator gets the ranked list on Telegram and presses **Approve**. No phone call can happen without that approval — this is enforced in code and covered by a test.
5. An AI voice agent phones each place, says how far the fire is and in which direction, and answers questions. It never invents facts: asked "which road should we use?", it says it does not know and gives 112.
6. Every call is classified from its transcript: `CONFIRMED`, `NEEDS_HELP`, `NO_ANSWER` or `UNCLEAR`, with a quote from the caller as evidence. Anything that is not confirmed goes back to the human with **Call again** / **Escalated to 112**.

The dashboard shows the map, the ranked list and every call with its transcript, duration, latency, model and tokens.

## Why it matters

In the Valencia floods of October 2024, the alert reached phones late and many people did not act. The gap was not the alert; it was that nobody knew who had heard it. Evac Caller closes that gap for the places where a missed message costs the most, and it hands every unanswered place back to a human instead of hiding it in a dashboard.

## How we built it

- **pnpm + TypeScript monorepo**, Node 22. `packages/core` holds the pure logic (fire replay, wind, danger zone, places at risk, ranking). 38 tests in total, 19 in `packages/core` and 19 in `apps/agent`, with no network calls in tests.
- **Mastra** agent on Telegram. The approval is a Mastra tool approval: `call_places` has `requireApproval: true`, and the Approve button press is recorded (Telegram user id, name, time) before the tool will run.
- **SLNG** voice agent over a Vonage SIP trunk, started with `POST /v1/agents/{id}/calls` and real call arguments.
- **Nebius Token Factory** for the coordinator LLM and the call-outcome classifier.
- **Next.js 15** dashboard: Leaflet map, replay slider, live call panel. The bot and the dashboard share an append-only event file, so there is no extra server to fail on stage.

## Real numbers from real calls

| Call | Result | Duration | Latency |
|---|---|---|---|
| `a09b5ad8-5144-4a8e-b206-e9af48f3ee1c` | rang, greeting named the place | 51.5 s | end-to-end 2.23 s, LLM first token 0.68 s, TTS first audio 0.24 s |
| `987fd3a8-7a7f-4451-a01b-ca133cfb4b4b` | `CONFIRMED`; refused to guess a road and gave 112 | 116 s | end-to-end 1.97 s, LLM first token 0.81 s, TTS first audio 0.21 s |

Outcome classification: Nebius `deepseek-ai/DeepSeek-V4-Flash-0731`, 1054 ms, 534 input + 229 output tokens, evidence quote "yes understood".

At the default replay hour, the data gives 26 places within 1 hour, 67 within 3 hours and 158 within 6 hours, including 13 care homes and 4 hospitals.

## Sponsor tracks we enter

- **Norrsken** — wildfire, values at risk: real satellite hotspots, measured wind, ranked places with vulnerable people.
- **SLNG** — the outbound voice agent and the phone calls.
- **Mastra** — the Telegram coordinator agent, its memory, and the human approval that holds every call.
- **Nebius** — the coordinator LLM and the outcome classifier, with model, latency and tokens logged for every call.

Vonage supplies the phone line, but the Vonage prize is for its Video API, so we do not enter it.

## What is honest about this demo

- It is a **replay** of a real past fire, not a live incident. The UI, the bot and the phone agent all say so.
- Every call rings our demo phone, never a real hospital. The phone agent opens with "this is an exercise, not a real emergency".
- The danger zone is a wind cone (head-fire spread at 10% of wind speed, Cruz & Alexander 2019), not a fire model. No terrain, no fuel, no firefighting.
- The wind station is 41 km from the fire.
- English only. One coordinator only. The dashboard has no login.

## What we would do next

Local wind instead of one airport station, real occupancy instead of a calendar rule, more than one coordinator, and a check of the place phone numbers against an official registry before any real deployment.
