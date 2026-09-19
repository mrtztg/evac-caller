#!/usr/bin/env bash
# Runs all code checks. Used by the Stop hook, the reviewer and before commits.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f package.json ]; then
  echo "check: no package.json yet, skipping"
  exit 0
fi

pnpm typecheck
pnpm lint
pnpm test
echo "check: OK"
