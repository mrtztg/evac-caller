---
description: Run the build loop for the current (or given) milestone until its gate.
argument-hint: "[M0|M1|M2|M3|M4]"
---

Milestone: $ARGUMENTS (if empty, use "Current milestone" in docs/PROGRESS.md).

1. Read CLAUDE.md, docs/PLAN.md (this milestone), docs/PROGRESS.md, docs/DECISIONS.md.
2. If this milestone starts with a gate (for example the UI gate in M3, or the fire choice in M2), do the gate first: prepare options and use AskUserQuestion. Log the answer in DECISIONS.md.
3. Split the milestone into small tasks (use the task list). For each task:
   - Check current docs for any external API (context7, SLNG llms.txt) before writing integration code.
   - Build it. Write tests for logic in packages/core.
   - Run `scripts/check.sh`. Fix until it passes.
   - Commit with a clear message. Update docs/PROGRESS.md.
4. When all tasks are done, write or update `docs/demo-scripts/<ID>.md` (numbered steps, the exact commands, and what the output must show).
5. Start the `reviewer` agent with the milestone ID and the git range of this milestone. Fix all blockers and majors, then run the reviewer again.
6. Start the `verifier` agent with the milestone ID.
7. Gate: show the user a short summary (what works, verifier result, reviewer result, open issues, time used vs. plan) and use AskUserQuestion: "Mark M? done / fix something first / change the plan". Log the answer.
8. If done: push to GitHub, update PROGRESS.md to the next milestone, then run /handoff.

If you are blocked by something only the user can do (an account, a key, a phone), stop and tell them exactly what to do, step by step, in simple English.
