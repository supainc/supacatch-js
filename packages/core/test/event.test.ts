import { assert, describe, it } from "@effect/vitest";
import { DateTime } from "effect";
import { FastCheck } from "effect/testing";
import { normalizeException } from "../src/event.js";

const timestamp = DateTime.makeUnsafe("2026-01-02T03:04:05.000Z");

describe("normalizeException", () => {
  it("normalizes Error values", () => {
    const error = new Error("boom");
    error.name = "TypeError";

    const event = normalizeException(error, timestamp);

    assert.strictEqual(event.name, "TypeError");
    assert.strictEqual(event.message, "boom");
    assert.strictEqual(event.stackTrace, error.stack);
    assert.strictEqual(event.timestamp, DateTime.formatIso(timestamp));
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
