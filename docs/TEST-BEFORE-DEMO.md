# Test before the demo

Everything here needs a human: Telegram, a real phone, or eyes on the screen. Nothing in this list can be checked by a script, so it is all still untested unless a line says otherwise. Work down the list in order; the first five are the demo itself.

Start two terminals: `pnpm bot` and `pnpm web` (dashboard on http://localhost:3000). Restart `pnpm bot` after any code change — it does not reload.

## 1. The whole demo, end to end (most important)
- [ ] In Telegram, ask "Which places are in danger?". The answer must name real places with distances and directions, say it is a replay, and give the data time.
- [ ] Say "Call the three health centres". A card with **Approve / Deny** appears.
- [ ] Press **Approve**. The demo phone rings.
- [ ] The agent says "This is an exercise, not a real emergency", names the place, the distance and the direction, and gives the instruction.
- [ ] **Within about 2 seconds, a card appears on the dashboard under Calls** with status `IN CALL`, the call ID, "approved by <your name>" and the dispatch time in ms. *(New in M3, never seen working.)*
- [ ] When the call ends, the card changes to `CONFIRMED` / `NEEDS HELP` / `NO ANSWER` / `UNCLEAR` with the quote, the transcript, the duration, the voice latency numbers and the classifier model, latency and tokens.
- [ ] Telegram shows the same result. **The two must agree.**
- [ ] **Write the call ID down** (M2's call ID was lost).

## 2. Safety
- [ ] Press **Deny** on a new request. No phone rings, no new card under Calls, and no new line in `data/runtime/call-events.jsonl`.
- [ ] On an unconfirmed place, press **Call again**: a new call starts and a new approval is recorded.
- [ ] On an unconfirmed place, press **Escalated to 112**: the dashboard card shows "<name> escalated this place to 112".

## 3. The dashboard on screen
- [ ] The map draws: real terrain, orange hotspots, the danger cone pointing away from the wind, one dot per place.
- [ ] Click a place in the list: its dot on the map grows. Click a dot on the map: the same row is selected in the list. *(Never tested in a browser.)*
- [ ] Move the replay slider. The map, the three pills and the list change. `cat data/runtime/replay-time.txt` shows the new hour.
- [ ] With the slider on 12:00 UTC, ask the bot "How many places are at risk?". It must answer 26 / 41 / 52, not 26 / 67 / 158. Move the slider back to 14:00 UTC afterwards.
- [ ] Nothing important is hidden behind a floating card at the resolution of the projector. Check at the real screen size before the demo.

## 4. The hard questions a judge will ask
- [ ] "Is Hospital X in danger?" for a place that **is** in the list: correct distance and direction.
- [ ] "Is <somewhere far away> in danger?": it must say it is not in the list, and not invent an answer.
- [ ] On the phone, ask "Which road should we use?": it must say it does not know and give 112.
- [ ] On the phone, ask "Is this real?": it must say it is an exercise.

## 5. Before we stand up
- [ ] Restart `pnpm bot` and `pnpm web` from clean, and run through section 1 once more. A stale bot process caused a bug at the M2 gate.
- [ ] `rm -rf data/runtime` so the Calls panel starts empty on stage.
- [ ] Phone charged, ringer on, not silent. The demo phone number is the one in `TEST_PHONE_NUMBER`.
- [ ] Venue wifi: the map loads OpenStreetMap tiles from the network. If the venue blocks them, the map is blank — the rest still works. Load the dashboard once on the venue wifi to check.

## Known gaps we are not fixing (say them out loud if asked)
- `rememberShownHour` is one value for the whole bot process, so two coordinators in two chats would share the same replay hour. One coordinator only.
- The dashboard has no login; anything on the same network can move the replay hour.
- `apps/web` has no tests; `callRows` (which builds the call cards) is only typechecked.
- Cost per call is not shown, only latency, model and tokens.
