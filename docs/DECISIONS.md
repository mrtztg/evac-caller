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
| 2026-09-19 17:42 | Accounts ready | SLNG, Nebius, Twilio, Galtea | All four | |
| 2026-09-19 17:42 | Deadline | Sunday 11:00 / midnight / unsure | Sunday 11:00 (we aim for 10:45) | |
| 2026-09-19 17:50 | Phone line setup | (found in SLNG docs) | Twilio SIP trunk connected in the SLNG dashboard, calls started with `POST /v1/agents/{id}/calls` | SLNG supports this directly, so we don't need our own audio streaming server. |
| 2026-09-19 18:05 | Phone agent models (found by testing the SLNG API) | Documented IDs failed with `AGENT_MODEL_UNAVAILABLE` | LLM `bedrock-mantle/nvidia.nemotron-super-3-120b:latest`, STT `deepgram/nova:3`, TTS `deepgram/aura:2` (voice `aura-2-thalia-en`), region `eu-central` | These are the ones the API accepts for our account and region. LLM can be overridden with `SLNG_AGENT_LLM`. |
