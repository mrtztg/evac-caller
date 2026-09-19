# Progress

**Current milestone:** M0 (real phone call)
**Status:** SLNG agent synced (id 3f4f89bf-b749-4606-9c0c-c544253c8d09). Vonage outbound connection (+447451265034) attached by `pnpm agent:sync`. Waiting for the first real test call.

## Done
- Repo, rules (CLAUDE.md), plan, agents, commands, check script.

## Next
- M0: user runs `pnpm call:test` and reports the result (steps 4-5 in `docs/demo-scripts/M0.md`).

## Blockers
- None known. If the call doesn't ring: check Vonage trial test numbers and outbound country permissions.

## Notes for a fresh session
- Read CLAUDE.md, then PLAN.md, then this file.
- SLNG agent model IDs that work: stt `deepgram/nova:3`, llm `bedrock-mantle/nvidia.nemotron-super-3-120b:latest`, tts `deepgram/aura:2`. The `groq/...` and non-`:latest` IDs are rejected.
- `outbound_greeting` is only allowed after a SIP trunk is attached. Until then it must be `null`.
