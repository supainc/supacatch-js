import { assert, describe, it } from "@effect/vitest";
import {
  supaCatchGlobalFunctionMiddleware,
  supaCatchGlobalRequestMiddleware,
  withSupaCatch,
} from "../../src/tanstack/client.js";

describe("TanStack Start browser exports", () => {
  it("provide no-op middleware stubs", () => {
    assert.deepStrictEqual(supaCatchGlobalRequestMiddleware.options, {});
    assert.deepStrictEqual(supaCatchGlobalFunctionMiddleware.options, {});
  });

  it("leaves a server entry unchanged", () => {
    const serverEntry = { fetch: () => new Response("ok") };
    assert.strictEqual(withSupaCatch(serverEntry), serverEntry);
  });
});
