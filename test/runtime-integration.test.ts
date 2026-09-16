import * as SupaCatch from "@supainc/supacatch-node";
import { supaCatchGlobalRequestMiddleware } from "@supainc/supacatch-tanstack-start";
import { assert, describe, it } from "@effect/vitest";
import { accepted, listen } from "./server.js";

describe("runtime automatic capture integration", () => {
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
