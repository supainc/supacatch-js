import { assert, describe, it } from "@effect/vitest";
import {
  supaCatchGlobalFunctionMiddleware,
  supaCatchGlobalRequestMiddleware,
  withSupaCatch,
} from "../src/client.js";

describe("TanStack Start browser exports", () => {
  it("provide no-op middleware stubs", () => {
    assert.deepStrictEqual(supaCatchGlobalRequestMiddleware.options, {});
    assert.deepStrictEqual(supaCatchGlobalFunctionMiddleware.options, {});
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
});
