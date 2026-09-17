import * as SupaCatch from "@supainc/supacatch-browser";
import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { accepted, listen } from "../../../test/server.js";

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

describe("browser global handlers", () => {
  it("replaces registrations and prevents stale disposal", () => {
    const restore = installEventTarget();
    try {
      const first = SupaCatch.init({ ingestKey: "sck_test_key" });
      assert.strictEqual(listenerCount("error"), 1);
      assert.strictEqual(listenerCount("unhandledrejection"), 1);

      const second = SupaCatch.init({ ingestKey: "sck_test_key" });
      assert.strictEqual(listenerCount("error"), 1);
      assert.strictEqual(listenerCount("unhandledrejection"), 1);

      first.dispose();
      assert.strictEqual(listenerCount("error"), 1);
      assert.strictEqual(listenerCount("unhandledrejection"), 1);

      second.dispose();
      assert.strictEqual(listenerCount("error"), 0);
      assert.strictEqual(listenerCount("unhandledrejection"), 0);
    } finally {
      restore();
    }
  });

  it("captures an unhandled error event", async () => {
    const restore = installEventTarget();
    const server = await listen(accepted);
    const client = SupaCatch.init({ endpoint: server.endpoint, ingestKey: "sck_test_key" });
    const error = new Error("browser exception");

    try {
      const event = new Event("error") as ErrorEvent;
      Object.defineProperty(event, "error", { value: error });
      Object.defineProperty(event, "message", { value: error.message });
      globalThis.dispatchEvent(event);

      await Effect.runPromise(Effect.sleep("100 millis"));
      assert.lengthOf(server.requests, 1);
      assert.include(server.requests[0]?.body ?? "", '"message":"browser exception"');
      assert.strictEqual(server.requests[0]?.authorization, "Bearer sck_test_key");
    } finally {
      client.dispose();
      await server.close();
      restore();
    }
  });

  it("captures an unhandled rejection event", async () => {
    const restore = installEventTarget();
    const server = await listen(accepted);
    const client = SupaCatch.init({ endpoint: server.endpoint, ingestKey: "sck_test_key" });
    const error = new Error("browser rejection");

    try {
      const event = new Event("unhandledrejection") as PromiseRejectionEvent;
      Object.defineProperty(event, "reason", { value: error });
      globalThis.dispatchEvent(event);

      await Effect.runPromise(Effect.sleep("100 millis"));
      assert.lengthOf(server.requests, 1);
      assert.include(server.requests[0]?.body ?? "", '"message":"browser rejection"');
    } finally {
      client.dispose();
      await server.close();
      restore();
    }
  });

  it("captures successive unhandled errors on the same page", async () => {
    const restore = installEventTarget();
    const server = await listen(accepted);
    const client = SupaCatch.init({ endpoint: server.endpoint, ingestKey: "sck_test_key" });

    try {
      for (const message of ["browser exception one", "browser exception two"]) {
        const error = new Error(message);
        const event = new Event("error") as ErrorEvent;
        Object.defineProperty(event, "error", { value: error });
        Object.defineProperty(event, "message", { value: error.message });
        globalThis.dispatchEvent(event);
      }

      await Effect.runPromise(Effect.sleep("150 millis"));
      assert.lengthOf(server.requests, 2);
      assert.include(server.requests[0]?.body ?? "", '"message":"browser exception one"');
      assert.include(server.requests[1]?.body ?? "", '"message":"browser exception two"');
    } finally {
      client.dispose();
      await server.close();
      restore();
    }
  });
});
