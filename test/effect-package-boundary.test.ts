import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { assert, describe, it } from "@effect/vitest";

interface PackageManifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
}

describe("Effect package boundary", () => {
  it("keeps Effect out of core's manifest and source", async () => {
    const manifest = JSON.parse(
      await readFile("packages/core/package.json", "utf8"),
    ) as PackageManifest;
    const dependencyGroups = [
      manifest.dependencies,
      manifest.devDependencies,
      manifest.optionalDependencies,
      manifest.peerDependencies,
    ];

    for (const dependencies of dependencyGroups) {
      assert.notProperty(dependencies ?? {}, "effect");
    }

    const sourceFiles = (await readdir("packages/core/src", { recursive: true })).filter((path) =>
      path.endsWith(".ts"),
    );
    for (const path of sourceFiles) {
      assert.notMatch(
        await readFile(join("packages/core/src", path), "utf8"),
        /from "effect(?:\/|")/,
      );
    }
  });

  it("puts the exact Effect peer on the sibling package", async () => {
    const manifest = JSON.parse(
      await readFile("packages/effect/package.json", "utf8"),
    ) as PackageManifest;

    assert.strictEqual(manifest.dependencies?.["@supainc/supacatch-core"], "0.1.0-alpha.6");
    assert.strictEqual(manifest.peerDependencies?.effect, "4.0.0-beta.103");
  });
});
