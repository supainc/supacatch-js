import * as BunSdk from "@supainc/supacatch-bun";
import * as CloudflareSdk from "@supainc/supacatch-cloudflare";
import * as CoreSdk from "@supainc/supacatch-core";
import * as EffectSdk from "@supainc/supacatch-effect";
import * as NodeSdk from "@supainc/supacatch-node";
import { assert, describe, it } from "@effect/vitest";

const sharedExports = Object.keys(CoreSdk).filter((name) => name !== "createClient");

describe("runtime package exports", () => {
  it("keeps Node and Bun on the runtime API", () => {
    const runtimeExports = [...sharedExports, "init"].sort();
    assert.deepStrictEqual(Object.keys(NodeSdk).sort(), runtimeExports);
    assert.deepStrictEqual(Object.keys(BunSdk).sort(), runtimeExports);
  });

  it("keeps Cloudflare on the worker API", () => {
    assert.deepStrictEqual(
      Object.keys(CloudflareSdk).sort(),
      [...sharedExports, "withCatch"].sort(),
    );
  });

  it("exposes Effect APIs only from the opt-in package", () => {
    assert.notInclude(Object.keys(CoreSdk), "layer");
    assert.include(Object.keys(EffectSdk), "layer");
    assert.include(Object.keys(EffectSdk), "SupaCatch");
  });
});
