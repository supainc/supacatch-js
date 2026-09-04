import { assert, describe, it } from "@effect/vitest";
import { execFileSync } from "node:child_process";

const resolveMiddleware = (conditions: ReadonlyArray<string>): string =>
  execFileSync(
    "node",
    [
      "--input-type=module",
      ...conditions.flatMap((condition) => [`--conditions=${condition}`]),
      "--eval",
      'const { supaCatchGlobalRequestMiddleware: middleware } = await import("@supainc/supacatch-core/tanstack-start"); process.stdout.write(typeof middleware.options.server)',
    ],
    { encoding: "utf8" },
  );

describe("TanStack Start package exports", () => {
  it("resolves browser builds to the no-op implementation", () => {
    assert.strictEqual(resolveMiddleware(["browser"]), "undefined");
  });

  it("resolves Node builds to the server implementation", () => {
    assert.include(resolveMiddleware([]), "function");
  });
});
