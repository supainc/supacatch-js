import { assert, describe, it } from "@effect/vitest";
import { createClient } from "../src/index.js";
import {
  CaptureTimeoutError,
  InvalidConfigurationError,
  InvalidSuccessResponseError,
  RejectedResponseError,
  TransportError,
  UnavailableResponseError,
  UnexpectedResponseError,
} from "../src/errors.js";
import { accepted, eventId, listen, silent } from "../../../test/server.js";

interface StatusErrorConstructor {
  new (input: { readonly status: number }): Error & {
    readonly status: number;
  };
}

const statusErrors: ReadonlyArray<readonly [number, StatusErrorConstructor]> = [
  [401, RejectedResponseError],
  [403, RejectedResponseError],
  [503, UnavailableResponseError],
  [418, UnexpectedResponseError],
];

describe("captureException", () => {
  it("submits one Event and returns its Event ID", async () => {
    const server = await listen(accepted);
    try {
      const client = createClient({
        endpoint: `${server.endpoint}/base/?private=value`,
        ingestKey: "sck_test_key",
      });
      const acceptedId = await client.captureException(new Error("boom"));

      assert.strictEqual(acceptedId, eventId);
      assert.lengthOf(server.requests, 1);
      assert.strictEqual(server.requests[0]?.authorization, "Bearer sck_test_key");
      assert.strictEqual(server.requests[0]?.url, "/base/v1/events");
      assert.include(server.requests[0]?.body ?? "", '"message":"boom"');
    } finally {
      await server.close();
    }
  });

  it("validates configuration when the client is created", () => {
    assert.throws(
      () => createClient({ endpoint: "ftp://ingest.example.test", ingestKey: "sck_test_key" }),
      InvalidConfigurationError,
    );
  });

  for (const [status, ErrorClass] of statusErrors) {
    it(`maps status ${status} without retrying`, async () => {
      const server = await listen((_request, response) => {
        response.writeHead(status);
        response.end();
      });
      try {
        const client = createClient({ endpoint: server.endpoint, ingestKey: "sck_test_key" });
        try {
          await client.captureException("boom");
          assert.fail("expected capture to fail");
        } catch (error) {
          assert.instanceOf(error, ErrorClass);
          assert.strictEqual(error.status, status);
        }
        assert.lengthOf(server.requests, 1);
      } finally {
        await server.close();
      }
    });
  }

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
        assert.strictEqual(error._tag, "CaptureTimeoutError");
        assert.strictEqual(error.timeoutMillis, 20);
      }
      assert.lengthOf(server.requests, 1);
    } finally {
      await server.close();
    }
  });

  it("disposes idempotently and rejects later captures without sending a request", async () => {
    const server = await listen(accepted);
    try {
      const client = createClient({ endpoint: server.endpoint, ingestKey: "sck_test_key" });
      client.dispose();
      client.dispose();

      try {
        await client.captureException("after dispose");
        assert.fail("expected capture to fail");
      } catch (error) {
        assert.instanceOf(error, TransportError);
      }
      assert.lengthOf(server.requests, 0);
    } finally {
      await server.close();
    }
  });
});
