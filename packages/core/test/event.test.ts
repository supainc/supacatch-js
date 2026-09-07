import { assert, describe, it } from "@effect/vitest";
import { FastCheck } from "effect/testing";
import { normalizeException } from "../src/event.js";

const timestamp = new Date("2026-01-02T03:04:05.000Z");

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

  it("falls back safely when both JSON and string conversion are hostile", () => {
    const value = {
      toJSON: () => {
        throw new Error("hostile JSON");
      },
      toString: () => {
        throw new Error("hostile string conversion");
      },
    };

    const event = normalizeException(value, timestamp);

    assert.strictEqual(event.name, "NonError");
    assert.strictEqual(event.message, "[Unserializable value]");
  });

  it("truncates fields to the ingest limits", () => {
    const error = new Error("m".repeat(10_001));
    error.name = "n".repeat(201);
    error.stack = "s".repeat(70_001);

    const event = normalizeException(error, timestamp);

    assert.lengthOf(event.name, 200);
    assert.lengthOf(event.message, 10_000);
    assert.lengthOf(event.stackTrace ?? "", 70_000);
  });

  it.prop("never throws for arbitrary values", [FastCheck.anything()], ([value]) => {
    normalizeException(value, timestamp);
  });
});
