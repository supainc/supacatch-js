import * as BunSdk from "@supainc/supacatch-bun";
import * as CloudflareSdk from "@supainc/supacatch-cloudflare";
import * as CoreSdk from "@supainc/supacatch-core";
import * as EffectSdk from "@supainc/supacatch-effect";
import * as NodeSdk from "@supainc/supacatch-node";
import { assert, describe, it } from "@effect/vitest";

const sharedExports = Object.keys(CoreSdk).filter((name) => name !== "createClient");

describe("runtime package exports", () => {
  it("puts the Effect service on its explicit package", () => {
    assert.deepStrictEqual(
      Object.keys(EffectSdk).sort(),
      [...sharedExports, "SupaCatch", "layer"].sort(),
    );
  });

  it("keeps Node and Bun on the runtime API", () => {
    const runtimeExports = [...sharedExports, "init", "layer"].sort();
    assert.deepStrictEqual(Object.keys(NodeSdk).sort(), runtimeExports);
    assert.deepStrictEqual(Object.keys(BunSdk).sort(), runtimeExports);
  });

  it("keeps Cloudflare on the worker API", () => {
    assert.deepStrictEqual(
      Object.keys(CloudflareSdk).sort(),
      [...sharedExports, "withCatch"].sort(),
    );
  });
});
