import { FatalAdapter, type FatalAdapterShape, installFatalCapture } from "../src/adapter.js";
import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

const install = (
  capture: (value: unknown) => Promise<void>,
  adapter: FatalAdapterShape,
): (() => void) =>
  Effect.runSync(installFatalCapture(capture).pipe(Effect.provideService(FatalAdapter, adapter)));

const makeAdapter = () => {
  let onFatal: ((value: unknown) => boolean) | undefined;
  let removals = 0;
  const firstFatals: Array<unknown> = [];
  const finishedFatals: Array<unknown> = [];
  const duplicateFatals: Array<unknown> = [];

  const adapter: FatalAdapterShape = {
    install: (handler) => {
      onFatal = handler;
      return () => {
        removals += 1;
      };
    },
    onFirstFatal: (value) => {
      firstFatals.push(value);
    },
    finishFatal: (value) => {
      finishedFatals.push(value);
    },
    finishDuplicateFatal: (value) => {
      duplicateFatals.push(value);
    },
  };

  return {
    adapter,
    emit: (value: unknown): boolean => onFatal?.(value) ?? false,
    firstFatals,
    finishedFatals,
    duplicateFatals,
    removals: () => removals,
  };
};

describe("fatal capture registration", () => {
  it("captures only the first fatal value and delegates duplicate termination", async () => {
    const harness = makeAdapter();
    let resolveCapture: (() => void) | undefined;
    const captured: Array<unknown> = [];
    const dispose = install(
      (value) =>
        new Promise((resolve) => {
          captured.push(value);
          resolveCapture = resolve;
        }),
      harness.adapter,
    );

    assert.isTrue(harness.emit("first"));
    assert.isFalse(harness.emit("second"));
    assert.deepStrictEqual(captured, ["first"]);
    assert.deepStrictEqual(harness.firstFatals, ["first"]);
    assert.deepStrictEqual(harness.duplicateFatals, ["second"]);
    assert.deepStrictEqual(harness.finishedFatals, []);

    resolveCapture?.();
    await Promise.resolve();
    assert.deepStrictEqual(harness.finishedFatals, ["first"]);
    dispose();
  });

  it("captures when the first-fatal side effect fails", async () => {
    const harness = makeAdapter();
    const captured: Array<unknown> = [];
    const dispose = install(
      (value) => {
        captured.push(value);
        return Promise.resolve();
      },
      {
        ...harness.adapter,
        onFirstFatal: () => {
          throw new Error("cannot report fatal");
        },
      },
    );

    assert.isTrue(harness.emit("fatal"));
    await Promise.resolve();
    assert.deepStrictEqual(captured, ["fatal"]);
    assert.deepStrictEqual(harness.finishedFatals, ["fatal"]);
    dispose();
  });

  it("replaces registrations without allowing stale disposal to remove the latest", () => {
    const first = makeAdapter();
    const second = makeAdapter();
    const firstDispose = install(() => Promise.resolve(), first.adapter);
    const secondDispose = install(() => Promise.resolve(), second.adapter);

    assert.strictEqual(first.removals(), 1);
    firstDispose();
    assert.strictEqual(second.removals(), 0);

    secondDispose();
    assert.strictEqual(second.removals(), 1);
  });

  it("keeps the active registration when replacement installation fails", () => {
    const active = makeAdapter();
    const dispose = install(() => Promise.resolve(), active.adapter);
    const failedAdapter: FatalAdapterShape = {
      install: () => {
        throw new Error("cannot register");
      },
      onFirstFatal: () => undefined,
      finishFatal: () => undefined,
      finishDuplicateFatal: () => undefined,
    };

    assert.throws(() => install(() => Promise.resolve(), failedAdapter));
    assert.strictEqual(active.removals(), 0);
    assert.isTrue(active.emit("still active"));
    dispose();
  });
});
