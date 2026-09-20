# Stage script: 3 minutes

Read this once before you go up. The left column is what you do, the right is what you say. Say the numbers out loud — sponsors ask for numbers.

## Before you stand up (2 minutes, off stage)

1. `rm -rf data/runtime` so the Calls panel starts empty.
2. Two terminals: `pnpm bot` and `pnpm web`. Wait for `Ready in ...` on the web one.
3. Open http://localhost:3000 once **on the venue wifi**. The map tiles come from OpenStreetMap over the network.
4. Phone: charged, ringer **on**, not silent. It is the number in `TEST_PHONE_NUMBER`.
5. Telegram open on the laptop screen you will project, chat with @evaccallerbot.
6. Slider on the default hour: `2026-07-25 14:00 UTC` (16:00 Spanish time). Check the three pills read **26 / 67 / 158**.

## 0:00 – 0:30 The problem

Show the full-screen map.

> "This is a real fire. Vall d'Uixó, Castellón, 25 July 2026. Nine thousand hectares, more than fifty thousand people evacuated or confined across sixteen towns. Everything you see is real data: NASA satellite hotspots, measured wind from the Valencia airport station. We are replaying it hour by hour."
>
> "When a fire like this moves, Spain sends ES-Alert. It goes to every phone in the area, one way, and nobody knows who read it. In the Valencia floods, that gap cost lives. We built the other half."

Point at the badge: `REPLAY — real data from a past fire`.

## 0:30 – 1:00 Who is in danger

Point at the incident card, then the ranked list.

> "197 hotspots at this hour. Wind from the west at 41 km per hour. From that we estimate how fast the fire front moves — ten percent of wind speed — and draw a cone for one, three and six hours. It is an estimate, not a fire simulation, and we say so on the screen."
>
> "Inside that cone: 26 places within one hour, 67 within three, 158 within six. Not houses — hospitals, care homes, schools and nurseries. The places where evacuation is slow. Thirteen care homes and four hospitals. They are ranked by how soon the fire can reach them, and inside each band the places with people inside come first."

Click one place in the list. Its dot grows on the map.

## 1:00 – 1:30 The human decides

Switch to Telegram.

Type: **"Which places are in danger?"**

> "The coordinator does not open a dashboard during an emergency. They have a phone. Same data, same ranking."

Type: **"Call the three health centres."**

> "Now watch. It lists what it will do — and stops."

Point at the **Approve / Deny** buttons.

> "Nothing dials until a human presses this. That is not a policy in a prompt, it is enforced in the code: the call tool refuses to run without a recorded approval, with the Telegram user id and the time. There is a test that proves no call can happen without it."

## 1:30 – 2:30 The call

Press **Approve**. Hold the phone up to the microphone.

> "This is a real outbound call over SLNG and a Vonage SIP trunk, to a real phone, right now."

Let the agent speak. It opens with the exercise wording, then names the place, the distance and the direction.

Ask it out loud: **"Which road should we use?"**

> "It does not know roads. So it says it does not know and gives 112. It never invents a fact — that is the failure that took the Cal Fire chatbot down."

Say **"Yes, understood"** and let it end.

While it runs, point at the dashboard Calls card: `IN CALL`, the call ID, who approved it.

## 2:30 – 3:00 The part nobody else does

Point at the finished call card.

> "The call is classified from its transcript — confirmed, needs help, no answer, unclear — and the model has to quote the caller's words as evidence. If it cannot, it says unclear. It never guesses a confirmation."
>
> "Here are the real numbers: end-to-end voice latency around two seconds, first token 0.8 seconds, first audio 0.2 seconds. The classifier is Nebius DeepSeek, about one second, 534 in and 229 out."
>
> "And this is the difference. Everyone can send an alert. We know **who confirmed** — and every place that did not confirm goes straight back to a human with 'call again' or 'escalate to 112'. Nothing disappears into a dashboard."

## If something breaks

Say the fallback out loud. Never pretend.

| What breaks | What you say and do |
|---|---|
| Map is blank (venue blocks OpenStreetMap tiles) | "The basemap tiles come from the network and the venue is blocking them. The data is local." Everything else — hotspots, cone, list, calls — still draws. Carry on. |
| Phone does not ring | "The line is not reaching us here, so let me show you two calls we recorded earlier." Run `pnpm call:status 987fd3a8-7a7f-4451-a01b-ca133cfb4b4b` and read the transcript and latency off the terminal. Call it a recording, never live. |
| Telegram is slow to answer | Keep talking over the map. The bot polls; it arrives. Do not press Approve twice. |
| Bot answers with old data or the wrong place | The bot process is stale. `Ctrl-C` the `pnpm bot` terminal and start it again — it does not reload code. This bit us once at the M2 gate. |
| Dashboard Calls panel stays empty | The bot writes `data/runtime/call-events.jsonl`; the page polls every 2 s. Show the Telegram result instead — it carries the same outcome, quote and numbers. |
| A judge asks something the bot does not know | Let the bot answer. If it says it does not know and gives 112, that is the product working, not a failure. Say so. |

## The three questions judges will ask

- **"Is this live or a replay?"** → "A replay of a real past fire. Real satellite data, real measured wind, real phone calls. The fire is from July."
- **"Do you call real hospitals?"** → "No. Every call in this demo rings our own phone, and the agent opens by saying it is an exercise. The numbers in OpenStreetMap are there, but we never dial them."
- **"How do you know the fire goes that way?"** → "We don't, exactly. It is a wind cone — head-fire spread at ten percent of wind speed, from a 2019 paper — not a fire model. No terrain, no fuel, no firefighting. The wind station is 41 km away. We label it an estimate everywhere it appears."
