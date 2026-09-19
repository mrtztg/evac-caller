# Progress

**Current milestone:** M0 (real phone call)
**Status:** SLNG agent synced (id 3f4f89bf-b749-4606-9c0c-c544253c8d09). Waiting for the Twilio outbound connection, then `pnpm call:test`.

## Done
- Repo, rules (CLAUDE.md), plan, agents, commands, check script.

## Next
- M0: user sets up SLNG agent + Twilio outbound connection (steps in `docs/demo-scripts/M0.md`).
- M0: `pnpm call:test` script.

## Blockers
- Needs from user: SLNG API key, SLNG agent ID, Twilio outbound connection active, verified phone number.

## Notes for a fresh session
- Read CLAUDE.md, then PLAN.md, then this file.
- SLNG agent model IDs that work: stt `deepgram/nova:3`, llm `bedrock-mantle/nvidia.nemotron-super-3-120b:latest`, tts `deepgram/aura:2`. The `groq/...` and non-`:latest` IDs are rejected.
- `outbound_greeting` is only allowed after a SIP trunk is attached. Until then it must be `null`.
