#!/usr/bin/env bash
# Stop hook: if code checks fail, block the stop once so Claude fixes them.
# Exit 2 = block and show stderr to Claude. Skip if already inside a hook-triggered continuation.
input=$(cat)
if echo "$input" | grep -q '"stop_hook_active": *true'; then
  exit 0
fi
cd "$(dirname "$0")/.."
# Only run when source files changed since the last commit.
if [ -z "$(git status --porcelain -- apps packages 2>/dev/null)" ]; then
  exit 0
fi
if ! out=$(scripts/check.sh 2>&1); then
  echo "Checks failed. Fix these before stopping (or explain why you can't):" >&2
  echo "$out" | tail -40 >&2
  exit 2
fi
exit 0
