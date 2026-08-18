import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import * as SupaCatch from "../../src/node.js";
import { supaCatchGlobalRequestMiddleware } from "../../src/tanstack/server.js";
import { accepted, listen } from "../server.js";

describe("TanStack Start Effect Layer", () => {
  it("registers capture for the Layer lifetime", async () => {
    const server = await listen(accepted);
    const error = new Error("layer initialized");

    try {
      await Effect.runPromise(
        Effect.tryPromise(async () => {
          try {
            await supaCatchGlobalRequestMiddleware.options.server?.({
              next: () => Promise.reject(error),
            });
            assert.fail("expected middleware to reject");
          } catch (cause) {
            assert.strictEqual(cause, error);
          }
        }).pipe(
          Effect.provide(SupaCatch.layer({ endpoint: server.endpoint, ingestKey: "sck_test_key" })),
        ),
      );

      assert.lengthOf(server.requests, 1);
      assert.include(server.requests[0]?.body ?? "", '"message":"layer initialized"');
    } finally {
      await server.close();
    }
  });
});
