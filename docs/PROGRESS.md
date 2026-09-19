# Progress

**Current milestone:** M0 (real phone call)
**Status:** M0 acceptance met (call 2). Reviewer PASS, verifier PASS; reviewer majors fixed. Waiting for: user adds `end_call` + `voicemail_detection` tools in the SLNG dashboard, then one verification call on prompt v4, then the M0 gate.

## Done
- Repo, rules (CLAUDE.md), plan, reviewer/verifier agents, /milestone /handoff /gate commands, check script + Stop hook.
- SLNG client: `dispatchCall` requires a recorded human `Approval` and non-empty call facts (tests), 15 s timeout.
- `pnpm agent:sync` (creates/updates agent by name, attaches the active outbound trunk), `pnpm call:test`, `pnpm call:status <id>` (transcript + latency).
- Phone prompt v4 (key message in greeting, no invented facts, asks confirmation + help needed, ends the call).
- Research on existing systems: `docs/research-existing-solutions.md`.

## Evidence
- Call 1 `a09b5ad8-5144-4a8e-b206-e9af48f3ee1c` (18:51, prompt v1): rang, greeting named the place, 51.5 s, completed. Background talk interrupted the agent for 30 s before the key message. Latency avg: e2e 2.23 s, LLM first token 0.68 s, TTS first audio 0.24 s. Fix: v2 speaks the key message in the greeting.

- Call 2 `987fd3a8-7a7f-4451-a01b-ca133cfb4b4b` (19:35, prompt v3, quiet room): key message in greeting; "Which road?" answered "I do not have information about roads... call 112" (no invention); asked for confirmation and help needed; recorded "I'm fine". 116 s. Latency avg: e2e 1.97 s, LLM 0.81 s, TTS 0.21 s. Issues fixed in v4: robotic "You asked: ..." when it didn't understand; said "End of call" without hanging up.

## Next
- Read the tool IDs from `GET /v1/agents/{id}/config` after the user adds the tools, and keep them in `evacAgentConfig.tool_refs` so sync doesn't lose them.
- One v4 call: check natural "can you repeat", goodbye + automatic hang-up.
- M0 gate, then `/handoff`, then the user starts a new session inside `evac-caller/` (so hooks, commands and agents load).

## Blockers
- None known. If the call doesn't ring: check Vonage trial test numbers and outbound country permissions.

## Notes for a fresh session
- Read CLAUDE.md, then PLAN.md, then this file.
- SLNG agent model IDs that work: stt `deepgram/nova:3`, llm `bedrock-mantle/nvidia.nemotron-super-3-120b:latest`, tts `deepgram/aura:2`. The `groq/...` and non-`:latest` IDs are rejected.
- `outbound_greeting` is only allowed after a SIP trunk is attached. Until then it must be `null`.
