import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { registerAutomatic } from "../../src/internal/automatic.js";
import * as SupaCatch from "../../src/node.js";
import {
  supaCatchGlobalFunctionMiddleware,
  supaCatchGlobalRequestMiddleware,
} from "../../src/tanstack/server.js";
import { accepted, listen } from "../server.js";

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

  it("uses the client registered by runtime initialization", async () => {
    const server = await listen(accepted);
    const client = SupaCatch.init({ endpoint: server.endpoint, ingestKey: "sck_test_key" });
    const error = new Error("runtime initialized");

    try {
      try {
        await supaCatchGlobalRequestMiddleware.options.server?.({
          next: () => Promise.reject(error),
        });
        assert.fail("expected middleware to reject");
      } catch (cause) {
        assert.strictEqual(cause, error);
      }
      assert.lengthOf(server.requests, 1);
      assert.include(server.requests[0]?.body ?? "", '"message":"runtime initialized"');
    } finally {
      client.dispose();
      await server.close();
    }
  });
});
