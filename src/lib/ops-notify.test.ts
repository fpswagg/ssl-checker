import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

function normalizeForFingerprint(text: string): string {
  return text
    .slice(0, 300)
    .replace(/\d{4}-\d{2}-\d{2}/g, "<date>")
    .replace(/\d{2}:\d{2}:\d{2}/g, "<time>")
    .replace(/\b\d+\b/g, "<n>");
}

function fingerprint(category: string, message: string): string {
  const raw = `${category}|${normalizeForFingerprint(message)}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

describe("ops-notify fingerprint", () => {
  it("treats same error with different timestamps as one fingerprint", () => {
    const a = fingerprint(
      "http-500",
      "Failed at 2026-05-19 12:00:00 for user 42",
    );
    const b = fingerprint(
      "http-500",
      "Failed at 2026-05-19 18:00:00 for user 99",
    );
    assert.equal(a, b);
  });

  it("differs by category", () => {
    const a = fingerprint("daily-check", "host failed");
    const b = fingerprint("weekly-report", "host failed");
    assert.notEqual(a, b);
  });
});
