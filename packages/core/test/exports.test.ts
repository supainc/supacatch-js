import { assert, describe, it } from "@effect/vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const packageRoot = resolve(import.meta.dirname, "..");
const adapterUrl = pathToFileURL(resolve(packageRoot, "dist/adapter.js")).href;

const resolveAdapterModule = (conditions: ReadonlyArray<string>): string =>
  execFileSync(
    "node",
    [
      "--input-type=module",
      ...conditions.flatMap((condition) => [`--conditions=${condition}`]),
      "--eval",
      'const resolved = import.meta.resolve("@supainc/supacatch-core/adapter"); process.stdout.write(resolved)',
    ],
    { cwd: packageRoot, encoding: "utf8" },
  );

describe("adapter package exports", () => {
  it("keeps worker runtimes on the AsyncLocalStorage adapter", () => {
    assert.strictEqual(resolveAdapterModule(["workerd"]), adapterUrl);
    assert.strictEqual(resolveAdapterModule(["worker"]), adapterUrl);
    assert.strictEqual(resolveAdapterModule([]), adapterUrl);
  });

  it("lists browser after workerd/worker so Workers do not get the sync store", () => {
    const manifest = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
      exports: { "./adapter": Record<string, string> };
    };
    const conditions = Object.keys(manifest.exports["./adapter"]);
    assert.strictEqual(manifest.exports["./adapter"].workerd, "./dist/adapter.js");
    assert.strictEqual(manifest.exports["./adapter"].worker, "./dist/adapter.js");
    assert.strictEqual(manifest.exports["./adapter"].browser, "./dist/adapter.browser.js");
    assert.isBelow(conditions.indexOf("workerd"), conditions.indexOf("browser"));
    assert.isBelow(conditions.indexOf("worker"), conditions.indexOf("browser"));
  });
});
