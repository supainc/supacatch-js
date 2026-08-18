import { assert, describe, it } from "@effect/vitest";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import {
  FatalAdapter,
  type FatalAdapterShape,
  installFatalCapture,
} from "../src/internal/fatal.js";
import * as SupaCatch from "../src/node.js";
import { accepted, listen, silent } from "./server.js";

const config = {
  endpoint: "https://ingest.example.test",
  ingestKey: "sck_test_key",
};

const install = (
  capture: (value: unknown) => Promise<void>,
  adapter: FatalAdapterShape,
): (() => void) =>
  Effect.runSync(installFatalCapture(capture).pipe(Effect.provideService(FatalAdapter, adapter)));

const makeAdapter = () => {
  let onFatal: ((value: unknown) => boolean) | undefined;
  let removals = 0;
  const firstFatals: Array<unknown> = [];
  const finishedFatals: Array<unknown> = [];
  const duplicateFatals: Array<unknown> = [];

  const adapter: FatalAdapterShape = {
    install: (handler) => {
      onFatal = handler;
      return () => {
        removals += 1;
      };
    },
    onFirstFatal: (value) => {
      firstFatals.push(value);
    },
    finishFatal: (value) => {
      finishedFatals.push(value);
    },
    finishDuplicateFatal: (value) => {
      duplicateFatals.push(value);
    },
  };

  return {
    adapter,
    emit: (value: unknown): boolean => onFatal?.(value) ?? false,
    firstFatals,
    finishedFatals,
    duplicateFatals,
    removals: () => removals,
  };
};

describe("fatal capture registration", () => {
  it("captures only the first fatal value and delegates duplicate termination", async () => {
    const harness = makeAdapter();
    let resolveCapture: (() => void) | undefined;
    const captured: Array<unknown> = [];
    const dispose = install(
      (value) =>
        new Promise((resolve) => {
          captured.push(value);
          resolveCapture = resolve;
        }),
      harness.adapter,
    );

    assert.isTrue(harness.emit("first"));
    assert.isFalse(harness.emit("second"));
    assert.deepStrictEqual(captured, ["first"]);
    assert.deepStrictEqual(harness.firstFatals, ["first"]);
    assert.deepStrictEqual(harness.duplicateFatals, ["second"]);
    assert.deepStrictEqual(harness.finishedFatals, []);

    resolveCapture?.();
    await Promise.resolve();
    assert.deepStrictEqual(harness.finishedFatals, ["first"]);
    dispose();
  });

  it("replaces registrations without allowing stale disposal to remove the latest", () => {
    const first = makeAdapter();
    const second = makeAdapter();
    const firstDispose = install(() => Promise.resolve(), first.adapter);
    const secondDispose = install(() => Promise.resolve(), second.adapter);

    assert.strictEqual(first.removals(), 1);
    firstDispose();
    assert.strictEqual(second.removals(), 0);

    secondDispose();
    assert.strictEqual(second.removals(), 1);
  });

  it("keeps the active registration when replacement installation fails", () => {
    const active = makeAdapter();
    const dispose = install(() => Promise.resolve(), active.adapter);
    const failedAdapter: FatalAdapterShape = {
      install: () => {
        throw new Error("cannot register");
      },
      onFirstFatal: () => undefined,
      finishFatal: () => undefined,
      finishDuplicateFatal: () => undefined,
    };

    assert.throws(() => install(() => Promise.resolve(), failedAdapter));
    assert.strictEqual(active.removals(), 0);
    assert.isTrue(active.emit("still active"));
    dispose();
  });
});

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

const denoCommand =
  spawnSync("deno", ["--version"], { stdio: "ignore" }).status === 0 ? "deno" : "bunx";

const runtimes: ReadonlyArray<{
  readonly command: string;
  readonly displayName: string;
  readonly entry: string;
  readonly arguments: ReadonlyArray<string>;
}> = [
  { command: "node", displayName: "node", entry: "node", arguments: ["--input-type=module", "-e"] },
  { command: "bun", displayName: "bun", entry: "bun", arguments: ["-e"] },
  {
    command: denoCommand,
    displayName: "deno",
    entry: "deno",
    arguments: denoCommand === "deno" ? ["eval"] : ["deno", "eval"],
  },
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
  const moduleUrl = pathToFileURL(resolve(`dist/${entry}.js`)).href;
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
