import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import process from "node:process";

interface SourceMap {
  mappings: string;
}

const [root] = process.argv.slice(2);
if (root === undefined) {
  throw new Error("usage: add-ts-self-types.ts <directory>");
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
    if (!entry.name.endsWith(".js")) continue;

    const declarationName = `${basename(entry.name, ".js")}.d.ts`;
    const declarationPath = join(directory, declarationName);
    try {
      await readFile(declarationPath);
    } catch {
      continue;
    }

    const source = await readFile(path, "utf8");
    const directive = `// @ts-self-types="./${declarationName}"`;
    if (source.startsWith(directive)) continue;

    const withoutExisting = source.replace(/^\/\/ @ts-self-types="[^"]+"\r?\n/, "");
    await writeFile(path, `${directive}\n${withoutExisting}`);

    const sourceMapPath = `${path}.map`;
    try {
      const sourceMap = JSON.parse(await readFile(sourceMapPath, "utf8")) as SourceMap;
      sourceMap.mappings = `;${sourceMap.mappings}`;
      await writeFile(sourceMapPath, JSON.stringify(sourceMap));
    } catch (error) {
      if (source.includes(`sourceMappingURL=${entry.name}.map`)) throw error;
    }
  }
}
