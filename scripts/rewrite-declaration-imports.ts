import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const [root] = process.argv.slice(2);
if (root === undefined) {
  throw new Error("usage: rewrite-declaration-imports.ts <directory>");
}

const directories = [root];

while (directories.length > 0) {
  const directory = directories.pop();
  if (directory === undefined) continue;

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      directories.push(path);
      continue;
    }
    if (!entry.name.endsWith(".d.ts")) continue;

    const declaration = await readFile(path, "utf8");
    const rewritten = declaration
      .replaceAll(/(from\s+["'][^"']+)\.js(["'])/g, "$1.d.ts$2")
      .replaceAll(/(import\(["'][^"']+)\.js(["']\))/g, "$1.d.ts$2");
    if (rewritten !== declaration) {
      await writeFile(path, rewritten);
    }
  }
}
