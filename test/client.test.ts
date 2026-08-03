import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { createClient } from "../src/index.js";
import { SupaCatch, layerFetch } from "../src/effect.js";
import {
  CaptureTimeoutError,
  InvalidSuccessResponseError,
  TransportError,
  UnavailableResponseError,
} from "../src/errors.js";
import { accepted, eventId, listen, silent } from "./server.js";

describe("captureException", () => {
  it("submits one Event and returns its Event ID", async () => {
    const server = await listen(accepted);
    try {
      const client = createClient({ endpoint: server.endpoint, ingestKey: "sck_test_key" });
      const acceptedId = await client.captureException(new Error("boom"));

      assert.strictEqual(acceptedId, eventId);
      assert.lengthOf(server.requests, 1);
      assert.strictEqual(server.requests[0]?.authorization, "Bearer sck_test_key");
      assert.strictEqual(server.requests[0]?.url, "/v1/events");
      assert.include(server.requests[0]?.body ?? "", '"message":"boom"');
    } finally {
      await server.close();
    }
  });

  it("runs the same implementation through the Effect service", async () => {
    const server = await listen(accepted);
    try {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const supaCatch = yield* SupaCatch;
          return yield* supaCatch.captureException("effect failure");
        }).pipe(
          Effect.provide(layerFetch({ endpoint: server.endpoint, ingestKey: "sck_test_key" })),
        ),
      );

      assert.strictEqual(result, eventId);
      assert.lengthOf(server.requests, 1);
    } finally {
      await server.close();
    }
  });

  it("does not retry unavailable responses", async () => {
    const server = await listen((_request, response) => {
      response.writeHead(503);
      response.end();
    });
    try {
      const client = createClient({ endpoint: server.endpoint, ingestKey: "sck_test_key" });
      try {
        await client.captureException("boom");
        assert.fail("expected capture to fail");
      } catch (error) {
        assert.instanceOf(error, UnavailableResponseError);
      }
      assert.lengthOf(server.requests, 1);
    } finally {
      await server.close();
    }
  });

  it("rejects malformed accepted responses", async () => {
    const server = await listen((_request, response) => {
      response.writeHead(202, { "content-type": "application/json" });
      response.end('{"eventId":"not-a-uuid"}');
    });
    try {
      const client = createClient({ endpoint: server.endpoint, ingestKey: "sck_test_key" });
      try {
        await client.captureException("boom");
        assert.fail("expected capture to fail");
      } catch (error) {
        assert.instanceOf(error, InvalidSuccessResponseError);
      }
    } finally {
      await server.close();
    }
  });

  it("never exposes the Ingest Key through transport failures", async () => {
    const secret = "sck_extremely_secret";
    const client = createClient({ endpoint: "http://127.0.0.1:1", ingestKey: secret });

    try {
      await client.captureException("boom");
      assert.fail("expected capture to fail");
    } catch (error) {
      assert.instanceOf(error, TransportError);
      assert.notInclude(String(error), secret);
      assert.notInclude(JSON.stringify(error), secret);
    }
  });

  it("times requests out", async () => {
    const server = await listen(silent);
    try {
      const client = createClient({
        endpoint: server.endpoint,
        ingestKey: "sck_test_key",
        requestTimeout: 20,
      });
      try {
        await client.captureException("boom");
        assert.fail("expected capture to time out");
      } catch (error) {
        assert.instanceOf(error, CaptureTimeoutError);
      }
      assert.lengthOf(server.requests, 1);
    } finally {
      await server.close();
    }
  });
});
