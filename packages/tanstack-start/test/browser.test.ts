import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { accepted, listen } from "../../../test/server.js";
import { init, supaCatchGlobalFunctionMiddleware, withSupaCatch } from "../src/client.js";

const listenerCount = (type: string): number => {
  const target = globalThis as typeof globalThis & {
    __supacatchListenerCounts?: Map<string, number>;
  };
  return target.__supacatchListenerCounts?.get(type) ?? 0;
};

const installEventTarget = (): (() => void) => {
  const target = new EventTarget();
  const counts = new Map<string, number>([
    ["error", 0],
    ["unhandledrejection", 0],
  ]);
  const host = globalThis as typeof globalThis & {
    __supacatchListenerCounts?: Map<string, number>;
    addEventListener: EventTarget["addEventListener"];
    removeEventListener: EventTarget["removeEventListener"];
    dispatchEvent: EventTarget["dispatchEvent"];
  };
  const previousAddEventListener = host.addEventListener;
  const previousRemoveEventListener = host.removeEventListener;
  const previousDispatchEvent = host.dispatchEvent;
  const previousCounts = host.__supacatchListenerCounts;

  host.__supacatchListenerCounts = counts;
  host.addEventListener = ((type, listener, options) => {
    counts.set(type, (counts.get(type) ?? 0) + 1);
    target.addEventListener(type, listener as EventListener, options);
  }) as EventTarget["addEventListener"];
  host.removeEventListener = ((type, listener, options) => {
    counts.set(type, Math.max(0, (counts.get(type) ?? 0) - 1));
    target.removeEventListener(type, listener as EventListener, options);
  }) as EventTarget["removeEventListener"];
  host.dispatchEvent = (event) => target.dispatchEvent(event);

  return () => {
    host.addEventListener = previousAddEventListener;
    host.removeEventListener = previousRemoveEventListener;
    host.dispatchEvent = previousDispatchEvent;
    if (previousCounts === undefined) {
      delete host.__supacatchListenerCounts;
    } else {
      host.__supacatchListenerCounts = previousCounts;
    }
  };
};

describe("TanStack Start browser exports", () => {
  it("provide no-op request middleware and client function middleware", () => {
    assert.deepStrictEqual(Object.keys(supaCatchGlobalFunctionMiddleware.options), ["client"]);
    assert.isFunction(supaCatchGlobalFunctionMiddleware.options.client);
  });

  it("leaves a server entry unchanged", () => {
    const serverEntry = { fetch: () => new Response("ok") };
    assert.strictEqual(withSupaCatch(serverEntry), serverEntry);
  });

  it("ignores a Cloudflare config argument and returns the entry", () => {
    const serverEntry = { fetch: () => new Response("ok") };
    assert.strictEqual(
      withSupaCatch((_env: { ingestKey: string }) => ({ ingestKey: "sck_unused" }), serverEntry),
      serverEntry,
    );
  });

  it("init captures browser errors after client instrumentation", async () => {
    const restore = installEventTarget();
    const server = await listen(accepted);
    const client = init({ endpoint: server.endpoint, ingestKey: "sck_test_key" });
    const error = new Error("tanstack browser exception");

    try {
      assert.strictEqual(listenerCount("error"), 1);
      assert.strictEqual(listenerCount("unhandledrejection"), 1);

      const event = new Event("error") as ErrorEvent;
      Object.defineProperty(event, "error", { value: error });
      Object.defineProperty(event, "message", { value: error.message });
      globalThis.dispatchEvent(event);

      await Effect.runPromise(Effect.sleep("100 millis"));
      assert.lengthOf(server.requests, 1);
      assert.include(server.requests[0]?.body ?? "", '"message":"tanstack browser exception"');
    } finally {
      client.dispose();
      await server.close();
      restore();
    }
  });
});
