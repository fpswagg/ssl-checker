import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveStatus,
  shouldSendFailureAlert,
  shouldSendRecoveryAlert,
} from "./status.js";

describe("deriveStatus", () => {
  const warnDays = 14;
  const now = new Date("2026-01-01T00:00:00Z");

  it("returns OK when expiry is beyond warn window", () => {
    const validTo = new Date("2026-02-01T00:00:00Z");
    assert.equal(deriveStatus(validTo, true, warnDays, now), "OK");
  });

  it("returns WARNING inside warn window", () => {
    const validTo = new Date("2026-01-10T00:00:00Z");
    assert.equal(deriveStatus(validTo, true, warnDays, now), "WARNING");
  });

  it("returns ERROR when expired", () => {
    const validTo = new Date("2025-12-01T00:00:00Z");
    assert.equal(deriveStatus(validTo, true, warnDays, now), "ERROR");
  });

  it("returns ERROR on hostname mismatch", () => {
    const validTo = new Date("2026-06-01T00:00:00Z");
    assert.equal(deriveStatus(validTo, false, warnDays, now), "ERROR");
  });
});

describe("alert transitions", () => {
  it("sends failure when worsening", () => {
    assert.equal(shouldSendFailureAlert("OK", "WARNING"), true);
    assert.equal(shouldSendFailureAlert("WARNING", "ERROR"), true);
    assert.equal(shouldSendFailureAlert("OK", "OK"), false);
  });

  it("sends recovery when back to OK", () => {
    assert.equal(shouldSendRecoveryAlert("ERROR", "OK"), true);
    assert.equal(shouldSendRecoveryAlert(null, "OK"), false);
  });
});
