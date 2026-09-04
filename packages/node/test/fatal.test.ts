import * as SupaCatch from "@supainc/supacatch-node";
import { assert, describe, it } from "@effect/vitest";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import { accepted, listen, silent } from "../../../test/server.js";

const config = {
  endpoint: "https://ingest.example.test",
  ingestKey: "sck_test_key",
};

describe("Node.js global handlers", () => {
  it("replaces registrations and prevents stale disposal", () => {
    const uncaughtBefore = process.listenerCount("uncaughtException");
    const rejectionBefore = process.listenerCount("unhandledRejection");

    const first = SupaCatch.init(config);
    assert.strictEqual(process.listenerCount("uncaughtException"), uncaughtBefore + 1);
    assert.strictEqual(process.listenerCount("unhandledRejection"), rejectionBefore + 1);

    const second = SupaCatch.init(config);
    assert.strictEqual(process.listenerCount("uncaughtException"), uncaughtBefore + 1);
    assert.strictEqual(process.listenerCount("unhandledRejection"), rejectionBefore + 1);

    first.dispose();
    assert.strictEqual(process.listenerCount("uncaughtException"), uncaughtBefore + 1);
    assert.strictEqual(process.listenerCount("unhandledRejection"), rejectionBefore + 1);

    second.dispose();
    assert.strictEqual(process.listenerCount("uncaughtException"), uncaughtBefore);
    assert.strictEqual(process.listenerCount("unhandledRejection"), rejectionBefore);
  });

  it("scopes Effect handler registration to the runtime Layer", async () => {
    const uncaughtBefore = process.listenerCount("uncaughtException");
    const rejectionBefore = process.listenerCount("unhandledRejection");

    await Effect.runPromise(
      Effect.gen(function* () {
        assert.strictEqual(process.listenerCount("uncaughtException"), uncaughtBefore + 1);
        assert.strictEqual(process.listenerCount("unhandledRejection"), rejectionBefore + 1);
        yield* Effect.void;
      }).pipe(Effect.provide(SupaCatch.layer(config))),
    );

    assert.strictEqual(process.listenerCount("uncaughtException"), uncaughtBefore);
    assert.strictEqual(process.listenerCount("unhandledRejection"), rejectionBefore);
  });
});

const packagesRoot = resolve(import.meta.dirname, "../..");

const runtimes: ReadonlyArray<{
  readonly command: string;
  readonly displayName: string;
  readonly entry: string;
  readonly arguments: ReadonlyArray<string>;
}> = [
  { command: "node", displayName: "node", entry: "node", arguments: ["--input-type=module", "-e"] },
  { command: "bun", displayName: "bun", entry: "bun", arguments: ["-e"] },
];

const failureKinds: ReadonlyArray<"exception" | "rejection"> = ["exception", "rejection"];

const available = (command: string): boolean =>
  spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;

const runFatalFixture = async (
  command: string,
  argumentsBeforeCode: ReadonlyArray<string>,
  entry: string,
  kind: "exception" | "rejection",
  respondToEvent = true,
): Promise<{
  readonly code: number | null;
  readonly elapsedMillis: number;
  readonly eventBodies: ReadonlyArray<string>;
}> => {
  const server = await listen(respondToEvent ? accepted : silent);
  const moduleUrl = pathToFileURL(resolve(packagesRoot, entry, "dist/index.js")).href;
  const failure =
    kind === "exception"
      ? 'setTimeout(() => { throw new Error("automatic exception") }, 0); await new Promise(() => {})'
      : 'Promise.reject(new Error("automatic rejection")); await new Promise(() => setTimeout(() => {}, 5_000))';
  const code = `import * as SupaCatch from ${JSON.stringify(moduleUrl)}; SupaCatch.init({ endpoint: ${JSON.stringify(
    server.endpoint,
  )}, ingestKey: "sck_test_key" }); ${failure};`;

  const startedAt = performance.now();
  const exitCode = await new Promise<number | null>((resolveExit, reject) => {
    const child = spawn(command, [...argumentsBeforeCode, code], { stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", resolveExit);
  });
  await server.close();

  return {
    code: exitCode,
    elapsedMillis: performance.now() - startedAt,
    eventBodies: server.requests.map((request) => request.body),
  };
};

describe("fatal automatic capture", () => {
  for (const runtime of runtimes) {
    for (const kind of failureKinds) {
      it.runIf(available(runtime.command))(
        `${runtime.displayName} captures an unhandled ${kind}`,
        async () => {
          const result = await runFatalFixture(
            runtime.command,
            runtime.arguments,
            runtime.entry,
            kind,
          );

          assert.strictEqual(result.code, 1);
          assert.lengthOf(result.eventBodies, 1);
          assert.include(result.eventBodies[0] ?? "", `automatic ${kind}`);
        },
      );
    }
  }

  it("bounds fatal delivery to two seconds", async () => {
    const result = await runFatalFixture(
      "node",
      ["--input-type=module", "-e"],
      "node",
      "exception",
      false,
    );

    assert.strictEqual(result.code, 1);
    assert.lengthOf(result.eventBodies, 1);
    assert.isAtLeast(result.elapsedMillis, 1_800);
    assert.isBelow(result.elapsedMillis, 3_500);
  });
});
