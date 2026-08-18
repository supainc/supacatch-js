import { assert, describe, it } from "@effect/vitest";
import type { CloudflareExecutionContext } from "../src/cloudflare.js";
import * as SupaCatch from "../src/cloudflare.js";
import { accepted, listen } from "./server.js";

const context: CloudflareExecutionContext = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
};

describe("withCatch", () => {
  it("captures a fetch handler exception before rethrowing it", async () => {
    const server = await listen(accepted);
    const error = new Error("worker failed");
    const worker = SupaCatch.withCatch(
      (env: { ingestKey: string }) => ({
        endpoint: server.endpoint,
        ingestKey: env.ingestKey,
      }),
      {
        async fetch() {
          throw error;
        },
      },
    );

    try {
      try {
        await worker.fetch(
          new Request("https://worker.example"),
          { ingestKey: "sck_test_key" },
          context,
        );
        assert.fail("expected fetch to reject");
      } catch (cause) {
        assert.strictEqual(cause, error);
      }

      assert.lengthOf(server.requests, 1);
      assert.include(server.requests[0]?.body ?? "", '"message":"worker failed"');
    } finally {
      await server.close();
    }
  });

  it("does not initialize capture when the handler succeeds", async () => {
    let configCalls = 0;
    const response = new Response("ok");
    const worker = SupaCatch.withCatch(
      (_env: unknown) => {
        configCalls += 1;
        return { ingestKey: "sck_test_key" };
      },
      {
        async fetch() {
          return response;
        },
      },
    );

    const result = await worker.fetch(new Request("https://worker.example"), undefined, context);

    assert.strictEqual(result, response);
    assert.strictEqual(configCalls, 0);
  });

  it("preserves the Worker exception when automatic capture fails", async () => {
    const error = new Error("original failure");
    const worker = SupaCatch.withCatch(
      (_env: unknown) => ({ endpoint: "http://127.0.0.1:1", ingestKey: "sck_test_key" }),
      {
        async fetch() {
          throw error;
        },
      },
    );

    try {
      await worker.fetch(new Request("https://worker.example"), undefined, context);
      assert.fail("expected fetch to reject");
    } catch (cause) {
      assert.strictEqual(cause, error);
    }
  });
});
