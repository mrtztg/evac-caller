// Where the data files live. Found from the working directory, so it also works when Next.js
// bundles this package and import.meta.url points inside .next.
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function findRoot(start: string): string | null {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

/** The repo root: the folder with pnpm-workspace.yaml. */
export function repoRoot(): string {
  const root = findRoot(process.cwd()) ?? findRoot(dirname(fileURLToPath(import.meta.url)));
  if (!root)
    throw new Error("repo root not found: no pnpm-workspace.yaml above the working directory");
  return root;
}

/** Fixture files: the real fire data, committed to the repo. */
export const fixturesDir = () => join(repoRoot(), "data", "fixtures");

/** Files written while the demo runs (call events, replay time). Git-ignored. Tests set EVAC_RUNTIME_DIR. */
export const runtimeDir = () => process.env.EVAC_RUNTIME_DIR || join(repoRoot(), "data", "runtime");
