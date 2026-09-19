# Progress

**Current milestone:** M0 (real phone call)
**Status:** SLNG agent synced (id 3f4f89bf-b749-4606-9c0c-c544253c8d09). Vonage outbound connection (+447451265034) attached by `pnpm agent:sync`. Waiting for the first real test call.

## Done
- Repo, rules (CLAUDE.md), plan, agents, commands, check script.

## Evidence
- Call 1 `a09b5ad8-5144-4a8e-b206-e9af48f3ee1c` (18:51, prompt v1): rang, greeting named the place, 51.5 s, completed. Background talk interrupted the agent for 30 s before the key message. Latency avg: e2e 2.23 s, LLM first token 0.68 s, TTS first audio 0.24 s. Fix: v2 speaks the key message in the greeting.

## Next
- M0: second test call with prompt v2 in a quiet place; ask "Which road should we take?" and check the 112 answer.

## Blockers
- None known. If the call doesn't ring: check Vonage trial test numbers and outbound country permissions.

## Notes for a fresh session
- Read CLAUDE.md, then PLAN.md, then this file.
- SLNG agent model IDs that work: stt `deepgram/nova:3`, llm `bedrock-mantle/nvidia.nemotron-super-3-120b:latest`, tts `deepgram/aura:2`. The `groq/...` and non-`:latest` IDs are rejected.
- `outbound_greeting` is only allowed after a SIP trunk is attached. Until then it must be `null`.
