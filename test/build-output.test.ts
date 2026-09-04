import { assert, describe, it } from "@effect/vitest";
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

describe("package build output", () => {
  it("links Deno types without shifting source maps", async () => {
    const packageEntries = await readdir("packages", { withFileTypes: true });

    for (const packageEntry of packageEntries) {
      if (!packageEntry.isDirectory()) continue;

      const directories = [join("packages", packageEntry.name, "dist")];
      while (directories.length > 0) {
        const directory = directories.pop();
        if (directory === undefined) continue;

        for (const entry of await readdir(directory, { withFileTypes: true })) {
          const path = join(directory, entry.name);
          if (entry.isDirectory()) {
            directories.push(path);
            continue;
          }
          if (!entry.name.endsWith(".js")) continue;

          const declarationName = `${basename(entry.name, ".js")}.d.ts`;
          try {
            await readFile(join(directory, declarationName));
          } catch {
            continue;
          }

          const source = await readFile(path, "utf8");
          assert.isTrue(source.startsWith(`// @ts-self-types="./${declarationName}"`));

          const sourceMap = JSON.parse(await readFile(`${path}.map`, "utf8")) as {
            readonly mappings: string;
          };
          assert.isTrue(sourceMap.mappings.startsWith(";"));
        }
      }
    }
  });
});
