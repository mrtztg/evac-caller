// Tests must not read data/runtime. That folder holds live demo state: the hour the dashboard
// slider is on and the call events. Without this, a test run depends on what was clicked last —
// moving the slider to an hour with no places at risk made two tests fail.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { env: { EVAC_RUNTIME_DIR: mkdtempSync(join(tmpdir(), "evac-agent-tests-")) } },
});
