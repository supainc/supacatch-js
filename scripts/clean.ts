import { rm } from "node:fs/promises";
import process from "node:process";

const directories = process.argv.slice(2);
if (directories.length === 0) {
  throw new Error("usage: clean.ts <directory> [...]");
}

await Promise.all(directories.map((directory) => rm(directory, { force: true, recursive: true })));
