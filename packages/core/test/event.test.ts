import { assert, describe, it } from "@effect/vitest";
import { FastCheck } from "effect/testing";
import { isEventEnvironment, normalizeException } from "../src/event.js";

const timestamp = new Date("2026-01-02T03:04:05.000Z");

describe("EventEnvironment", () => {
  it("accepts Sentry-compatible names", () => {
    assert.isTrue(isEventEnvironment("production"));
    assert.isTrue(isEventEnvironment("preview-123"));
  });

  it("rejects reserved and unsupported names", () => {
    assert.isFalse(isEventEnvironment(""));
    assert.isFalse(isEventEnvironment("None"));
    assert.isFalse(isEventEnvironment("preview branch"));
    assert.isFalse(isEventEnvironment("review/123"));
    assert.isFalse(isEventEnvironment("a".repeat(65)));
  });
});

describe("normalizeException", () => {
  it("normalizes Error values", () => {
    const error = new Error("boom");
    error.name = "TypeError";

    const event = normalizeException(error, timestamp);

    assert.strictEqual(event.name, "TypeError");
    assert.strictEqual(event.message, "boom");
    assert.strictEqual(event.stackTrace, error.stack);
    assert.strictEqual(event.timestamp, timestamp.toISOString());
  });

  it("normalizes cyclic non-Error values", () => {
    const value: { self?: unknown } = {};
    value.self = value;

    const event = normalizeException(value, timestamp);

    assert.strictEqual(event.name, "NonError");
    assert.strictEqual(event.message, '{"self":"[Circular]"}');
  });

  it("does not invoke hostile Error properties successfully", () => {
    const error = new Error("hidden");
    Object.defineProperty(error, "message", {
      get: () => {
        throw new Error("hostile getter");
      },
    });

    const event = normalizeException(error, timestamp);

    assert.strictEqual(event.name, "Error");
    assert.strictEqual(event.message, "");
  });

  it.prop("never throws for arbitrary values", [FastCheck.anything()], ([value]) => {
    normalizeException(value, timestamp);
  });
});
