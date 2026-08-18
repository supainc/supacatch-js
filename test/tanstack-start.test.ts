import { assert, describe, it } from "@effect/vitest";
import type { SupaCatchClient } from "../src/client.js";
import type { EventId } from "../src/event.js";
import {
  supaCatchFunctionMiddleware,
  supaCatchRequestMiddleware,
  withSupaCatch,
} from "../src/tanstack-start.js";

const eventId = "0198a0b0-0000-7000-8000-000000000001" as EventId;

const makeClient = (
  capture: (value: unknown) => Promise<EventId> = () => Promise.resolve(eventId),
): SupaCatchClient => ({
  captureException: capture,
  dispose: () => undefined,
});

describe("TanStack Start middleware", () => {
  for (const [name, createMiddleware] of [
    ["request", supaCatchRequestMiddleware],
    ["server function", supaCatchFunctionMiddleware],
  ] as const) {
    it(`captures a ${name} exception before rethrowing it`, async () => {
      const error = new Error(`${name} failed`);
      const captured: Array<unknown> = [];
      const middleware = createMiddleware(
        makeClient(async (value) => {
          captured.push(value);
          return eventId;
        }),
      );

      try {
        await middleware.options.server?.({
          next: () => Promise.reject(error),
        });
        assert.fail("expected middleware to reject");
      } catch (cause) {
        assert.strictEqual(cause, error);
      }

      assert.deepStrictEqual(captured, [error]);
    });
  }

  it("returns successful middleware results without capturing an Event", async () => {
    const captured: Array<unknown> = [];
    const middleware = supaCatchRequestMiddleware(
      makeClient(async (value) => {
        captured.push(value);
        return eventId;
      }),
    );
    const response = new Response("ok");

    const result = await middleware.options.server?.({ next: () => response });

    assert.strictEqual(result, response);
    assert.deepStrictEqual(captured, []);
  });
});

describe("withSupaCatch", () => {
  it("captures a server entry exception before rethrowing it", async () => {
    const error = new Error("server entry failed");
    const captured: Array<unknown> = [];
    const serverEntry = withSupaCatch(
      {
        marker: "preserved",
        fetch: () => Promise.reject(error),
      },
      makeClient(async (value) => {
        captured.push(value);
        return eventId;
      }),
    );

    assert.strictEqual(serverEntry.marker, "preserved");
    try {
      await serverEntry.fetch(new Request("https://example.test"));
      assert.fail("expected server entry to reject");
    } catch (cause) {
      assert.strictEqual(cause, error);
    }

    assert.deepStrictEqual(captured, [error]);
  });

  it("preserves the original exception when Event capture fails", async () => {
    const error = new Error("original failure");
    const serverEntry = withSupaCatch(
      {
        fetch: () => Promise.reject(error),
      },
      makeClient(() => Promise.reject(new Error("capture failed"))),
    );

    try {
      await serverEntry.fetch(new Request("https://example.test"));
      assert.fail("expected server entry to reject");
    } catch (cause) {
      assert.strictEqual(cause, error);
    }
  });

  it("captures an exception only once across nested adapter layers", async () => {
    const error = new Error("nested failure");
    const captured: Array<unknown> = [];
    const client = makeClient(async (value) => {
      captured.push(value);
      return eventId;
    });
    const functionMiddleware = supaCatchFunctionMiddleware(client);
    const requestMiddleware = supaCatchRequestMiddleware(client);
    const serverEntry = withSupaCatch(
      {
        fetch: () =>
          requestMiddleware.options.server?.({
            next: () =>
              functionMiddleware.options.server?.({
                next: () => Promise.reject(error),
              }),
          }) as Promise<Response>,
      },
      client,
    );

    try {
      await serverEntry.fetch(new Request("https://example.test"));
      assert.fail("expected server entry to reject");
    } catch (cause) {
      assert.strictEqual(cause, error);
    }

    assert.deepStrictEqual(captured, [error]);
  });
});
