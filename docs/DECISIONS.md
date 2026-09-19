# Decisions

Every gate answer from the user goes here. Newest at the bottom.

| Date/time | Question | Options | Choice | Why |
|---|---|---|---|---|
| 2026-09-19 17:40 | Tech stack | All TypeScript / Python + TS / choose per part | All TypeScript (pnpm monorepo, Mastra, Next.js) | Mastra is TypeScript. One language is simpler. |
| 2026-09-19 17:40 | How the phone call works | Real phone / browser phone / both | Real phone call | Strongest demo moment. Browser phone is the fallback if M0 fails. |
| 2026-09-19 17:40 | Fire data | Replay past fire / live only / Deepfire | Replay a real past fire | Real data (Norrsken rule) and a repeatable demo. |
| 2026-09-19 17:40 | Call language | Spanish / Catalan / English | English | Easy for all judges. |
| 2026-09-19 17:42 | How autonomous Claude is | Checkpoints only / ask often / very autonomous | Checkpoints only | Claude builds alone, stops at gates (see CLAUDE.md). |
| 2026-09-19 17:42 | Repo | Public GitHub / local / private | New public GitHub repo | Mastra and Cognition count a public repo. |
| 2026-09-19 17:42 | Accounts ready | SLNG, Nebius, telephony, Galtea | All four | |
| 2026-09-19 17:42 | Deadline | Sunday 11:00 / midnight / unsure | Sunday 11:00 (we aim for 10:45) | |
| 2026-09-19 17:50 | Phone line setup | (found in SLNG docs) | SIP trunk connected in the SLNG dashboard, calls started with `POST /v1/agents/{id}/calls` | SLNG supports this directly, so we don't need our own audio streaming server. |
| 2026-09-19 18:40 | Telephony provider | Twilio / Vonage | Vonage (user set it up) | SIP trunk from Vonage, number +447451265034, attached to the SLNG agent. Note: Vonage's prize challenge is for its Video API, so this does not enter the Vonage prize. |
| 2026-09-19 19:20 | Add confirmation tracking + escalation after the research | Add it / keep plan / change direction | Add it | ES-Alert is one-way and Everbridge uses "press 1". Our difference: we know who confirmed, and unconfirmed places go back to a human (Paiporta lesson). Outcome is classified by Nebius from the transcript. |
| 2026-09-19 19:55 | M0 gate | Done, skip end_call / one more call / fix first | M0 done; skip end_call and voicemail tools | Built-in tool IDs are not public (API `tools` is only for webhook tools). SLNG idle timeout already hangs up. NO_ANSWER will come from the transcript (no caller turns). Prompt v4 is tested in the first M1 call. |
| 2026-09-19 22:05 | M1 gate (asked at M2 start) | M1 done / M1 open, test later | M1 done | User tested the Telegram flow. |
| 2026-09-19 22:05 | M2: which real fire | Vall d'Uixó / Sierra Oeste / La Mierla | Vall d'Uixó (Castellón, 25 Jul 2026) | ~9,300 ha, >50,000 people evacuated or confined in 16 towns. OSM has 55 schools, 16 clinics, 6 care homes within 15 km. Right size for a 1-6 h wind estimate. The other team (eldtechnologies) uses Los Gallardos. |
| 2026-09-19 22:05 | M2: FIRMS key | User gets free MAP_KEY / find no-key source | User adds `FIRMS_MAP_KEY` to `.env` | Real satellite points. |
| 2026-09-19 22:05 | M2: wind source | Meteostat station / Open-Meteo via phone hotspot | Meteostat hourly station data | Open-Meteo blocks the venue IP ("Daily API request limit exceeded"). Meteostat bulk is free, no key, real measured wind. |
