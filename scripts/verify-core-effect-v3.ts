import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { accepted, eventId, listen, type IngestServer } from "../test/server.js";

const execute = promisify(execFile);
const workspaceRoot = resolve(import.meta.dirname, "..");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "supacatch-core-effect-v3-"));
let server: IngestServer | undefined;
let cleanupError: unknown;

try {
  await execute("bun", ["run", "--filter", "@supainc/supacatch-core", "build"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  const { stdout: packOutput } = await execute(
    "npm",
    ["pack", "./packages/core", "--pack-destination", temporaryDirectory, "--json"],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
    },
  );
  const packResult: unknown = JSON.parse(packOutput);
  if (!Array.isArray(packResult) || packResult.length !== 1) {
    throw new Error("npm pack did not return one core tarball");
  }
  const packedEntry: unknown = packResult[0];
  if (typeof packedEntry !== "object" || packedEntry === null) {
    throw new Error("npm pack returned an invalid result");
  }
  const tarballName: unknown = Reflect.get(packedEntry, "filename");
  if (typeof tarballName !== "string") {
    throw new Error("npm pack did not return a tarball filename");
  }

  await writeFile(
    join(temporaryDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: "supacatch-core-effect-v3-boundary",
        private: true,
        type: "module",
        dependencies: {
          "@supainc/supacatch-core": `file:./${tarballName}`,
          effect: "3.19.4",
        },
      },
      undefined,
      2,
    )}\n`,
  );
  await execute(
    "npm",
    ["install", "--strict-peer-deps", "--ignore-scripts", "--no-audit", "--no-fund"],
    {
      cwd: temporaryDirectory,
      encoding: "utf8",
    },
  );

  const { stdout: dependencyTreeOutput } = await execute(
    "npm",
    ["ls", "effect", "--all", "--json"],
    {
      cwd: temporaryDirectory,
      encoding: "utf8",
    },
  );
  const dependencyTree: unknown = JSON.parse(dependencyTreeOutput);
  if (typeof dependencyTree !== "object" || dependencyTree === null) {
    throw new Error("npm ls returned an invalid dependency tree");
  }
  const dependencies: unknown = Reflect.get(dependencyTree, "dependencies");
  if (
    typeof dependencies !== "object" ||
    dependencies === null ||
    Object.keys(dependencies).length !== 2
  ) {
    throw new Error("the isolated project resolved unexpected dependencies");
  }
  const installedEffect: unknown = Reflect.get(dependencies, "effect");
  if (
    typeof installedEffect !== "object" ||
    installedEffect === null ||
    Reflect.get(installedEffect, "version") !== "3.19.4" ||
    Reflect.get(installedEffect, "dependencies") !== undefined
  ) {
    throw new Error("the isolated project did not resolve only effect@3.19.4");
  }

  await writeFile(
    join(temporaryDirectory, "consumer.ts"),
    `import { createClient, type EventId } from "@supainc/supacatch-core";

export const capture = async (endpoint: string): Promise<EventId> => {
  const client = createClient({ endpoint, ingestKey: "sck_test_key" });
  try {
    return await client.captureException(new Error("isolated TypeScript consumer"));
  } finally {
    client.dispose();
  }
};
`,
  );
  await execute(
    resolve(workspaceRoot, "node_modules/.bin/tsc"),
    [
      "--noEmit",
      "--strict",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--lib",
      "ES2022,DOM,DOM.Iterable",
      "consumer.ts",
    ],
    {
      cwd: temporaryDirectory,
      encoding: "utf8",
    },
  );

  server = await listen(accepted);
  await writeFile(
    join(temporaryDirectory, "consumer.mjs"),
    `import { createClient } from "@supainc/supacatch-core";

const client = createClient({
  endpoint: process.argv[2],
  ingestKey: "sck_test_key",
});
try {
  const eventId = await client.captureException(new Error("isolated runtime consumer"));
  const secret = "sck_isolated_secret";
  const failingClient = createClient({
    endpoint: "http://127.0.0.1:1",
    ingestKey: secret,
  });
  try {
    await failingClient.captureException("transport failure");
    throw new Error("expected transport failure");
  } catch (error) {
    if (String(error).includes(secret) || JSON.stringify(error).includes(secret)) {
      throw new Error("transport failure exposed the ingest key");
    }
  } finally {
    failingClient.dispose();
  }
  process.stdout.write(eventId);
} finally {
  client.dispose();
}
`,
  );
  const { stdout: capturedId } = await execute("node", ["consumer.mjs", server.endpoint], {
    cwd: temporaryDirectory,
    encoding: "utf8",
    timeout: 30_000,
  });

  if (capturedId !== eventId) {
    throw new Error(`capture returned unexpected Event ID ${capturedId}`);
  }
  if (server.requests.length !== 1) {
    throw new Error(`capture sent ${server.requests.length} requests instead of one`);
  }
  if (server.requests[0]?.url !== "/v1/events") {
    throw new Error(`capture used unexpected path ${server.requests[0]?.url}`);
  }

  console.log(`packed: @supainc/supacatch-core@0.1.0-alpha.6`);
  console.log(`installed beside: effect@3.19.4`);
  console.log("import: passed");
  console.log("typecheck: passed");
  console.log(`capture: ${capturedId} in ${server.requests.length} request`);
} finally {
  if (server !== undefined) {
    try {
      await server.close();
    } catch (cause) {
      if (
        typeof cause !== "object" ||
        cause === null ||
        Reflect.get(cause, "code") !== "ERR_SERVER_NOT_RUNNING"
      ) {
        cleanupError = cause;
      }
    }
  }
  await rm(temporaryDirectory, { force: true, recursive: true });
}

if (cleanupError !== undefined) throw cleanupError;
