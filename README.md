# Evac Caller

When a wildfire moves, Evac Caller finds the hospitals, schools and care homes in its path, asks the emergency coordinator to approve on Telegram, and then an AI voice agent phones each place.

Built at HackBarna AI Summit 2026. Work in progress: see `docs/PLAN.md` and `docs/PROGRESS.md`.

## Setup
```bash
pnpm install
cp .env.example .env   # fill in the keys
pnpm agent:sync        # create/update the SLNG phone agent
pnpm call:test         # ring your test phone
```

## Built with
SLNG (voice agent and phone calls), Mastra (Telegram coordinator agent), Nebius Token Factory (LLM), NASA FIRMS, Open-Meteo and OpenStreetMap (real data), Galtea (evaluation).
