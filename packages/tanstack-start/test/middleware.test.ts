import { registerAutomatic } from "@supainc/supacatch-core/adapter";
import {
  supaCatchGlobalFunctionMiddleware,
  supaCatchGlobalRequestMiddleware,
} from "@supainc/supacatch-tanstack-start";
import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

describe("TanStack Start middleware", () => {
  for (const [name, middleware] of [
    ["request", supaCatchGlobalRequestMiddleware],
    ["server function", supaCatchGlobalFunctionMiddleware],
  ] as const) {
    it(`captures a ${name} exception before rethrowing it`, async () => {
      const error = new Error(`${name} failed`);
      const captured: Array<unknown> = [];
      const deactivate = registerAutomatic((value) => Effect.sync(() => captured.push(value)));

      try {
        try {
          await middleware.options.server?.({ next: () => Promise.reject(error) });
          assert.fail("expected middleware to reject");
        } catch (cause) {
          assert.strictEqual(cause, error);
        }
        assert.deepStrictEqual(captured, [error]);
      } finally {
        deactivate();
      }
    });
  }

  it("returns successful results without a registered client", async () => {
    const response = new Response("ok");
    const result = await supaCatchGlobalRequestMiddleware.options.server?.({
      next: () => response,
    });
    assert.strictEqual(result, response);
  });

  it("preserves exceptions without a registered client", async () => {
    const error = new Error("not initialized");
    try {
      await supaCatchGlobalRequestMiddleware.options.server?.({
        next: () => Promise.reject(error),
      });
      assert.fail("expected middleware to reject");
    } catch (cause) {
      assert.strictEqual(cause, error);
    }
  });
});
