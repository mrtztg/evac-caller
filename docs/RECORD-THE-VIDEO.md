# Record the video (one take, ~2:30)

The video is required to submit. Aim for **one take**. Do not re-record for small mistakes — a judge watching a hackathon video forgives a stumble, and you do not have time for a second run.

Different from `docs/DEMO-STAGE-SCRIPT.md`: that one is for the live stage. This one is shorter, has no fallback talk, and is ordered so a single recording never has to wait for anything.

## Set up first (do all of this before you press record)

1. `rm -rf data/runtime` — the Calls panel must start empty.
2. `pnpm bot` and `pnpm web` in two terminals. Wait for `Ready in ...`.
3. Browser on http://localhost:3000, **full screen**, slider on `2026-07-25 14:00 UTC`. Check the pills read **26 / 67 / 158**.
4. Telegram open in a second window, chat with @evaccallerbot, scrolled clean.
5. Phone next to the laptop microphone. Ringer **on**. Speakerphone ready — you will put the call on speaker so the microphone picks up the agent's voice.
6. Have this sentence typed but **not sent** in Telegram: `Call the three health centres`.

## Record

macOS: `Cmd-Shift-5` → **Record Entire Screen** → under Options pick your **microphone** (without it there is no voice-over and no phone audio) → Record.

Then, in this order, talking while you click:

**0:00 — map on screen**

> "This is a real fire: Vall d'Uixó, Castellón, July 2026. Nine thousand hectares, fifty thousand people evacuated. Real NASA satellite hotspots, real measured wind. We replay it hour by hour."

**0:20 — point at the incident card and the pills**

> "The wind is from the west at 41 km an hour. We estimate the fire front at ten percent of wind speed and draw a cone for one, three and six hours — an estimate, not a fire simulation. Inside it: 26 places within an hour, 67 within three, 158 within six. Hospitals, care homes, schools. Thirteen care homes, four hospitals."

**0:40 — switch to Telegram, type "Which places are in danger?"**

> "The coordinator has a phone, not a dashboard. Same data, same ranking."

**1:00 — send "Call the three health centres"**

> "Now it stops and asks a human."

Point at **Approve / Deny**.

> "Nothing dials without this press. It is enforced in the code, not in a prompt — the call tool refuses to run without a recorded approval, and a test proves it."

**1:15 — press Approve, put the phone on speaker near the microphone**

> "This is a real call over SLNG and a Vonage line."

Let the agent speak its opening (it says it is an exercise, names the place, the distance and the direction). Then ask out loud:

> "Which road should we use?"

It will say it does not know and give 112.

> "It never invents a fact. That is the failure that took the Cal Fire chatbot down."

Say **"Yes, understood"** so the call ends.

**2:00 — switch to the dashboard Calls card**

> "The call is classified from its transcript, and the model must quote the caller's words as evidence — no quote, no confirmation. Voice latency about two seconds end to end. Classifier: Nebius DeepSeek, one second, 534 tokens in, 229 out."

**2:20 — last line**

> "Everyone can send an alert. We know who confirmed — and every place that did not confirm goes straight back to a human. That is Evac Caller."

Stop recording.

## After

1. **Write the call ID down** from the dashboard card. Put it in `docs/PROGRESS.md` under Evidence.
2. Upload to YouTube as **Unlisted** (fastest, no processing wait for short videos) or Google Drive with link sharing on. Check the link opens in a private browser window.
3. Paste the link into `docs/SUBMISSION.md` line 6, fill team names on line 7, submit, then paste the receipt on line 8.

## If a take goes wrong

- **Phone does not ring:** stop, say so, and record the rest without the live call; then show `pnpm call:status 987fd3a8-7a7f-4451-a01b-ca133cfb4b4b` on screen and say clearly it is an earlier recorded call. Never present it as live.
- **Bot answers with old data:** `Ctrl-C` the `pnpm bot` terminal, start it again, re-record. It does not reload code.
- **You run long:** cut nothing from the approval moment or the call. Cut the map narration at 0:20 instead.
