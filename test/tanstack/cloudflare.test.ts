import { assert, describe, it } from "@effect/vitest";
import type { CloudflareExecutionContext } from "../../src/cloudflare.js";
import * as SupaCatch from "../../src/cloudflare.js";
import { withSupaCatch } from "../../src/tanstack/server.js";
import { accepted, listen } from "../server.js";

interface Env {
  readonly endpoint: string;
  readonly fail: boolean;
  readonly ingestKey: string;
}

const context: CloudflareExecutionContext = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
};

const makeWorker = (error: Error) =>
  SupaCatch.withCatch(
    (env: Env) => ({ endpoint: env.endpoint, ingestKey: env.ingestKey }),
    withSupaCatch({
      async fetch(_request: Request, env: Env) {
        if (env.fail) throw error;
        return new Response("ok");
      },
    }),
  );

describe("TanStack Start on Cloudflare", () => {
  it("uses the failing request environment after an earlier request succeeds", async () => {
    const firstServer = await listen(accepted);
    const secondServer = await listen(accepted);
    const error = new Error("second request failed");
    const worker = makeWorker(error);

    try {
      await worker.fetch(
        new Request("https://worker.example/first"),
        { endpoint: firstServer.endpoint, fail: false, ingestKey: "sck_first" },
        context,
      );

      try {
        await worker.fetch(
          new Request("https://worker.example/second"),
          { endpoint: secondServer.endpoint, fail: true, ingestKey: "sck_second" },
          context,
        );
        assert.fail("expected fetch to reject");
      } catch (cause) {
        assert.strictEqual(cause, error);
      }

      assert.lengthOf(firstServer.requests, 0);
      assert.lengthOf(secondServer.requests, 1);
      assert.strictEqual(secondServer.requests[0]?.authorization, "Bearer sck_second");
    } finally {
      await firstServer.close();
      await secondServer.close();
    }
  });

  it("isolates concurrent requests that throw the same Error", async () => {
    let markFirstCapture: () => void = () => undefined;
    let releaseFirstCapture: () => void = () => undefined;
    const firstCaptureStarted = new Promise<void>((resolve) => {
      markFirstCapture = resolve;
    });
    const firstCaptureReleased = new Promise<void>((resolve) => {
      releaseFirstCapture = resolve;
    });
    const firstServer = await listen((request, response) => {
      markFirstCapture();
      void firstCaptureReleased.then(() => accepted(request, response));
    });
    const secondServer = await listen(accepted);
    const error = new Error("shared failure");
    const worker = makeWorker(error);

    const firstRequest = Promise.resolve(
      worker.fetch(
        new Request("https://worker.example/first"),
        { endpoint: firstServer.endpoint, fail: true, ingestKey: "sck_first" },
        context,
      ),
    ).then(
      () => assert.fail("expected first fetch to reject"),
      (cause: unknown) => assert.strictEqual(cause, error),
    );

    try {
      await firstCaptureStarted;
      try {
        await worker.fetch(
          new Request("https://worker.example/second"),
          { endpoint: secondServer.endpoint, fail: true, ingestKey: "sck_second" },
          context,
        );
        assert.fail("expected second fetch to reject");
      } catch (cause) {
        assert.strictEqual(cause, error);
      }

      assert.lengthOf(secondServer.requests, 1);
      assert.strictEqual(secondServer.requests[0]?.authorization, "Bearer sck_second");
    } finally {
      releaseFirstCapture();
      await firstRequest;
      await firstServer.close();
      await secondServer.close();
    }
  });
});
