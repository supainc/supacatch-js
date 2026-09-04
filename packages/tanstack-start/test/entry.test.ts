import { registerAutomatic } from "@supainc/supacatch/internal/automatic";
import {
  supaCatchGlobalFunctionMiddleware,
  supaCatchGlobalRequestMiddleware,
  withSupaCatch,
} from "@supainc/supacatch-tanstack-start";
import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

describe("withSupaCatch", () => {
  it("captures an exception before rethrowing it", async () => {
    const error = new Error("server entry failed");
    const captured: Array<unknown> = [];
    const deactivate = registerAutomatic((value) => Effect.sync(() => captured.push(value)));
    const serverEntry = withSupaCatch({
      marker: "preserved",
      fetch: (_request: Request) => Promise.reject(error),
    });

    try {
      assert.strictEqual(serverEntry.marker, "preserved");
      try {
        await serverEntry.fetch(new Request("https://example.test"));
        assert.fail("expected server entry to reject");
      } catch (cause) {
        assert.strictEqual(cause, error);
      }
      assert.deepStrictEqual(captured, [error]);
    } finally {
      deactivate();
    }
  });

  it("preserves the original exception when capture fails", async () => {
    const error = new Error("original failure");
    const deactivate = registerAutomatic(() => Effect.fail(new Error("capture failed")));
    const serverEntry = withSupaCatch({
      fetch: (_request: Request) => Promise.reject(error),
    });

    try {
      try {
        await serverEntry.fetch(new Request("https://example.test"));
        assert.fail("expected server entry to reject");
      } catch (cause) {
        assert.strictEqual(cause, error);
      }
    } finally {
      deactivate();
    }
  });

  it("captures once across nested adapter layers", async () => {
    const error = new Error("nested failure");
    const captured: Array<unknown> = [];
    const deactivate = registerAutomatic((value) => Effect.sync(() => captured.push(value)));
    const serverEntry = withSupaCatch({
      fetch: (_request: Request) =>
        supaCatchGlobalRequestMiddleware.options.server?.({
          next: () =>
            supaCatchGlobalFunctionMiddleware.options.server?.({
              next: () => Promise.reject(error),
            }),
        }) as Promise<Response>,
    });

    try {
      try {
        await serverEntry.fetch(new Request("https://example.test"));
        assert.fail("expected server entry to reject");
      } catch (cause) {
        assert.strictEqual(cause, error);
      }
      assert.deepStrictEqual(captured, [error]);
    } finally {
      deactivate();
    }
  });
});
