import assert from "node:assert/strict";
import test from "node:test";
import { shouldSendWeeklyReport } from "./weekly-report-scheduler.js";

test("shouldSendWeeklyReport sends on configured day after hour UTC", () => {
  const sundayMorning = new Date("2026-06-21T08:59:00.000Z");
  assert.equal(shouldSendWeeklyReport(sundayMorning, null), false);

  const sundayAfterNine = new Date("2026-06-21T09:00:00.000Z");
  assert.equal(shouldSendWeeklyReport(sundayAfterNine, null), true);
  assert.equal(
    shouldSendWeeklyReport(sundayAfterNine, "2026-06-21"),
    false,
  );
});

test("shouldSendWeeklyReport skips other weekdays", () => {
  const thursday = new Date("2026-06-18T10:00:00.000Z");
  assert.equal(shouldSendWeeklyReport(thursday, null), false);
});
