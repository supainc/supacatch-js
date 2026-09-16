import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { accepted, eventId, listen } from "../../../test/server.js";
import { layer, SupaCatch } from "../src/index.js";

describe("Effect integration", () => {
  it("captures through the opt-in service", async () => {
    const server = await listen(accepted);
    try {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const supaCatch = yield* SupaCatch;
          return yield* supaCatch.captureException("effect failure");
        }).pipe(Effect.provide(layer({ endpoint: server.endpoint, ingestKey: "sck_test_key" }))),
      );

      assert.strictEqual(result, eventId);
      assert.lengthOf(server.requests, 1);
    } finally {
      await server.close();
    }
  });
});
