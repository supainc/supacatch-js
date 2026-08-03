# `@supainc/supacatch-js`

Official SupaCatch SDK for server-side JavaScript. The first release supports Node.js, Bun, and Deno with one runtime-neutral capture implementation.

> Do not bundle this package into browser code. A SupaCatch Ingest Key is a secret. Browser support requires a separate authentication model and will use `@supainc/supacatch-browser`.

## Install

```sh
npm install @supainc/supacatch-js@alpha
```

```sh
bun add @supainc/supacatch-js@alpha
```

Deno resolves the package through npm:

```ts
import { init } from "npm:@supainc/supacatch-js@alpha/deno";
```

## Automatic capture

Use the entry point for your runtime. Initialization automatically captures uncaught exceptions and unhandled promise rejections in the current process or isolate.

### Node.js

```ts
import { init } from "@supainc/supacatch-js/node";

const ingestKey = process.env.SUPACATCH_INGEST_KEY;
if (!ingestKey) throw new Error("SUPACATCH_INGEST_KEY is required");

const supaCatch = init({
  endpoint: "https://your-ingest.example.com",
  ingestKey,
});
```

### Bun

```ts
import { init } from "@supainc/supacatch-js/bun";

const ingestKey = Bun.env.SUPACATCH_INGEST_KEY;
if (!ingestKey) throw new Error("SUPACATCH_INGEST_KEY is required");

const supaCatch = init({
  endpoint: "https://your-ingest.example.com",
  ingestKey,
});
```

### Deno

```ts
import { init } from "npm:@supainc/supacatch-js@alpha/deno";

const ingestKey = Deno.env.get("SUPACATCH_INGEST_KEY");
if (!ingestKey) throw new Error("SUPACATCH_INGEST_KEY is required");

const supaCatch = init({
  endpoint: "https://your-ingest.example.com",
  ingestKey,
});
```

Fatal capture waits for delivery for at most two seconds and then preserves fatal termination. Call `init` inside every worker or isolate that should capture failures.

Only the latest initialized client owns automatic capture. `dispose()` removes that client's handlers:

```ts
supaCatch.dispose();
```

## Manual capture

The shared entry point installs no global handlers:

```ts
import { createClient } from "@supainc/supacatch-js";

const ingestKey = process.env.SUPACATCH_INGEST_KEY;
if (!ingestKey) throw new Error("SUPACATCH_INGEST_KEY is required");

const supaCatch = createClient({
  endpoint: "https://your-ingest.example.com",
  ingestKey,
  requestTimeout: 5_000,
});

const eventId = await supaCatch.captureException(new Error("Example failure"));
```

`captureException` accepts `unknown`, performs exactly one request, and resolves with the Event ID only after the ingest endpoint returns a valid `202` response. It never retries.

## Effect

```ts
import { Effect } from "effect";
import { SupaCatch, layerFetch } from "@supainc/supacatch-js/effect";

const ingestKey = process.env.SUPACATCH_INGEST_KEY;
if (!ingestKey) throw new Error("SUPACATCH_INGEST_KEY is required");

const program = Effect.gen(function* () {
  const supaCatch = yield* SupaCatch;
  return yield* supaCatch.captureException(new Error("Example failure"));
}).pipe(
  Effect.provide(
    layerFetch({
      endpoint: "https://your-ingest.example.com",
      ingestKey,
    }),
  ),
);
```

Expected failures remain typed in the Effect error channel and reject Promise calls as the corresponding public error instances.

Use the runtime Layer when an Effect application also wants automatic capture:

```ts
import { Effect } from "effect";
import { SupaCatch } from "@supainc/supacatch-js/effect";
import { layer } from "@supainc/supacatch-js/node";

const program = Effect.gen(function* () {
  const supaCatch = yield* SupaCatch;
  yield* supaCatch.captureException("manual capture still uses the same client");
  yield* Effect.never;
}).pipe(
  Effect.provide(
    layer({
      endpoint: "https://your-ingest.example.com",
      ingestKey,
    }),
  ),
);

await Effect.runPromise(program);
```

The runtime Layer removes its global handlers automatically when its scope closes.

## Privacy and delivery semantics

SupaCatch sends exception names, messages, raw stack strings, and capture timestamps. This release has no redaction hook or source-map processing. Never place an Ingest Key in logs, client-side bundles, or public configuration.

A successful capture means the ingest endpoint accepted the Event into its queue. It does not mean downstream grouping or storage has completed.

## Compatibility

- Node.js 20.19 or newer maintained releases
- Bun 1.3 or newer
- Deno 2.x
- ESM only
