import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { assert, describe, it } from "@effect/vitest";

interface PackageManifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly exports?: Readonly<Record<string, unknown>>;
  readonly name: string;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly version: string;
}

describe("Effect package boundary", () => {
  it("keeps Effect out of core's manifest, source, JavaScript, and declarations", async () => {
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
    assert.notProperty(manifest.exports ?? {}, "./effect");
    assert.notProperty(manifest.exports ?? {}, "./adapter");

    const files = (
      await Promise.all(
        ["packages/core/src", "packages/core/dist"].map(async (directory) =>
          (await readdir(directory, { recursive: true }))
            .filter((path) => path.endsWith(".ts") || path.endsWith(".js") || path.endsWith(".map"))
            .map((path) => join(directory, path)),
        ),
      )
    ).flat();
    assert.isNotEmpty(files);

    for (const path of files) {
      assert.notMatch(
        await readFile(path, "utf8"),
        /["']effect(?:\/[^"']*)?["']/,
        `${path} must not reference Effect`,
      );
    }
  });

  it("puts exact core and Effect versions on the sibling package", async () => {
    const manifest = JSON.parse(
      await readFile("packages/effect/package.json", "utf8"),
    ) as PackageManifest;

    assert.strictEqual(manifest.version, "0.1.0-alpha.6");
    assert.deepStrictEqual(manifest.dependencies, {
      "@supainc/supacatch-core": "0.1.0-alpha.6",
    });
    assert.deepStrictEqual(manifest.peerDependencies, {
      effect: "4.0.0-beta.103",
    });
    assert.hasAllKeys(manifest.exports ?? {}, [".", "./adapter", "./package.json"]);
  });

  it("makes every direct adapter consumer depend on the Effect sibling", async () => {
    for (const directory of ["node", "cloudflare", "tanstack-start"]) {
      const manifest = JSON.parse(
        await readFile(join("packages", directory, "package.json"), "utf8"),
      ) as PackageManifest;

      assert.strictEqual(manifest.dependencies?.["@supainc/supacatch-effect"], "0.1.0-alpha.6");
      assert.strictEqual(manifest.peerDependencies?.effect, "4.0.0-beta.103");
    }
  });

  it("publishes Effect after core and rejects the already-published stale core", async () => {
    const workflow = await readFile(".github/workflows/release.yml", "utf8");
    const corePosition = workflow.indexOf("            packages/core \\");
    const effectPosition = workflow.indexOf("            packages/effect \\");

    assert.isAtLeast(corePosition, 0);
    assert.isAbove(effectPosition, corePosition);
    assert.include(workflow, 'npm view "$core_name@$core_version" peerDependencies.effect');
    assert.match(workflow, /if \[ -n "\$published_core_effect_peer" \]; then[\s\S]*?exit 1/);
  });
});
