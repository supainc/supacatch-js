import {
  InvalidConfigurationError,
  layer,
  SupaCatch,
  TransportError,
} from "@supainc/supacatch-effect";
import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { accepted, eventId, listen } from "../../../test/server.js";

describe("Effect service", () => {
  it("captures through the core client implementation", async () => {
    const server = await listen(accepted);
    try {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const supaCatch = yield* SupaCatch;
          return yield* supaCatch.captureException("effect failure");
        }).pipe(
          Effect.provide(
            layer({
              endpoint: `${server.endpoint}/base/?private=value`,
              ingestKey: "sck_test_key",
            }),
          ),
        ),
      );

      assert.strictEqual(result, eventId);
      assert.lengthOf(server.requests, 1);
      assert.strictEqual(server.requests[0]?.url, "/base/v1/events");
    } finally {
      await server.close();
    }
  });

  it("keeps invalid configuration in the typed error channel", async () => {
    try {
      await Effect.runPromise(
        Effect.void.pipe(
          Effect.provide(
            layer({
              endpoint: "file:///tmp/events",
              ingestKey: "sck_test_key",
            }),
          ),
        ),
      );
      assert.fail("expected Layer construction to fail");
    } catch (error) {
      assert.instanceOf(error, InvalidConfigurationError);
    }
  });

  it("disposes the core client when the Layer scope closes", async () => {
    const capture = await Effect.runPromise(
      Effect.map(SupaCatch, (service) => service.captureException).pipe(
        Effect.provide(
          layer({
            endpoint: "https://ingest.example.test",
            ingestKey: "sck_test_key",
          }),
        ),
      ),
    );

    try {
      await Effect.runPromise(capture("after scope"));
      assert.fail("expected capture to fail");
    } catch (error) {
      assert.instanceOf(error, TransportError);
    }
  });
});
