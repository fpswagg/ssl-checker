import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeHost } from "./normalize-url.js";

describe("normalizeHost", () => {
  it("strips scheme and path", () => {
    assert.equal(normalizeHost("https://Example.com/path"), "example.com");
  });

  it("rejects empty input", () => {
    assert.throws(() => normalizeHost("  "), /required/i);
  });

  it("rejects invalid hostnames", () => {
    assert.throws(() => normalizeHost("not a host"), /invalid/i);
  });
});
