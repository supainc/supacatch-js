import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

interface PackageManifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly name: string;
  readonly version: string;
}

const packageDirectories = (await readdir("packages", { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => join("packages", entry.name));
const manifests = await Promise.all(
  packageDirectories.map(async (directory) => ({
    directory,
    manifest: JSON.parse(
      await readFile(join(directory, "package.json"), "utf8"),
    ) as PackageManifest,
  })),
);
const versions = new Set(manifests.map(({ manifest }) => manifest.version));

if (versions.size !== 1) {
  throw new Error(
    `package versions must match: ${manifests
      .map(({ manifest }) => `${manifest.name}@${manifest.version}`)
      .join(", ")}`,
  );
}

const [version] = versions;
for (const { manifest } of manifests) {
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  for (const [dependency, dependencyVersion] of Object.entries(dependencies)) {
    if (dependency.startsWith("@supainc/supacatch") && dependencyVersion !== version) {
      throw new Error(
        `${manifest.name} depends on ${dependency}@${dependencyVersion}, expected ${version}`,
      );
    }
  }
}
