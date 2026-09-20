import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import {
  appendEvent,
  type CallEvent,
  readEvents,
  readReplayTime,
  writeReplayTime,
} from "./events.js";

beforeEach(() => {
  process.env.EVAC_RUNTIME_DIR = mkdtempSync(join(tmpdir(), "evac-events-"));
});

const started: CallEvent = {
  type: "call_started",
  time: "2026-07-25T14:00:00.000Z",
  place_id: "way/1",
  place_name: "Centre de Salut Nules",
  call_id: "abc",
  api_latency_ms: 420,
  approved_by: "Morteza",
  approved_at: "2026-07-25T13:59:00.000Z",
};

test("events are read back in the order they were written", () => {
  expect(readEvents()).toEqual([]);
  appendEvent(started);
  appendEvent({ ...started, type: "call_failed", error: "no answer" } as CallEvent);
  const events = readEvents();
  expect(events.map((e) => e.type)).toEqual(["call_started", "call_failed"]);
  expect(events[0]).toEqual(started);
});

test("a half-written last line is skipped, not thrown", () => {
  appendEvent(started);
  const file = join(process.env.EVAC_RUNTIME_DIR as string, "call-events.jsonl");
  writeFileSync(file, `${JSON.stringify(started)}\n{"type":"call_out`, "utf8");
  expect(readEvents()).toEqual([started]);
});

test("the replay time is empty until the dashboard sets it", () => {
  expect(readReplayTime()).toBeNull();
  writeReplayTime("2026-07-25T14:00:00.000Z");
  expect(readReplayTime()).toBe("2026-07-25T14:00:00.000Z");
});

test("a replay time that is not a date is refused", () => {
  expect(() => writeReplayTime("later")).toThrow(/not a date/);
});
