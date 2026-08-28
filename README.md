# `@supainc/supacatch-js`

Official SupaCatch SDK for server-side JavaScript. The first release supports Node.js, Bun, Deno, and Cloudflare Workers with one runtime-neutral capture implementation.

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
import * as SupaCatch from "npm:@supainc/supacatch-js@alpha/deno";
```

## Automatic capture

Use the entry point for your runtime. Initialization automatically captures uncaught exceptions and unhandled promise rejections in the current process or isolate.

### Node.js

```ts
import * as SupaCatch from "@supainc/supacatch-js/node";

const ingestKey = process.env.SUPACATCH_INGEST_KEY;
if (!ingestKey) throw new Error("SUPACATCH_INGEST_KEY is required");

const supaCatch = SupaCatch.init({ ingestKey });
```

### Bun

```ts
import * as SupaCatch from "@supainc/supacatch-js/bun";

const ingestKey = Bun.env.SUPACATCH_INGEST_KEY;
if (!ingestKey) throw new Error("SUPACATCH_INGEST_KEY is required");

const supaCatch = SupaCatch.init({ ingestKey });
```

### Deno

```ts
import * as SupaCatch from "npm:@supainc/supacatch-js@alpha/deno";

const ingestKey = Deno.env.get("SUPACATCH_INGEST_KEY");
if (!ingestKey) throw new Error("SUPACATCH_INGEST_KEY is required");

const supaCatch = SupaCatch.init({ ingestKey });
```

### Cloudflare Workers

Wrap the Worker's exported handler. Configuration is resolved lazily from the Worker's environment when the first exception is captured.

```ts
import * as SupaCatch from "@supainc/supacatch-js/cloudflare";

interface Env {
  SUPACATCH_INGEST_KEY: string;
}

export default SupaCatch.withCatch((env: Env) => ({ ingestKey: env.SUPACATCH_INGEST_KEY }), {
  async fetch(request) {
    return new Response(`Requested ${new URL(request.url).pathname}`);
  },
});
```

When the handler throws or rejects, the wrapper attempts delivery for at most two seconds and then rethrows the original value. Capture failures never replace the Worker exception. The wrapper catches only failures that propagate through the `fetch` handler; module initialization failures, detached tasks, and platform terminations require a Tail Worker.

### TanStack Start

The TanStack Start adapter captures server-side failures from requests, Server Functions, and the server entry point. It uses conditional exports: server builds receive the capture implementation, while browser builds receive middleware stubs with no server handler. The Ingest Key and SDK client therefore never enter the browser module graph.

Add the two global middlewares first in their arrays. Import them directly from the package; do not put them in a `*.server.ts` module because `src/start.ts` is also transformed for the browser.

```ts
// src/start.ts
import {
  supaCatchGlobalFunctionMiddleware,
  supaCatchGlobalRequestMiddleware,
} from "@supainc/supacatch-js/tanstack-start";
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => ({
  requestMiddleware: [supaCatchGlobalRequestMiddleware],
  functionMiddleware: [supaCatchGlobalFunctionMiddleware],
}));
```

Initialize the runtime in an explicit server entry and wrap its handler. Runtime initialization registers the capture client used by the global middlewares.

```ts
// src/server.ts
import * as SupaCatch from "@supainc/supacatch-js/node";
import { withSupaCatch } from "@supainc/supacatch-js/tanstack-start";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

const ingestKey = process.env.SUPACATCH_INGEST_KEY;
if (!ingestKey) throw new Error("SUPACATCH_INGEST_KEY is required");

SupaCatch.init({ ingestKey });

export default createServerEntry(
  withSupaCatch({
    fetch(request: Request) {
      return handler.fetch(request);
    },
  }),
);
```

On Cloudflare Workers, pass the environment configuration function as the first argument to `withSupaCatch`. Each request resolves that configuration lazily and supplies a request-scoped client to the TanStack middlewares.

```ts
// src/server.ts
import { withSupaCatch } from "@supainc/supacatch-js/tanstack-start";
import handler from "@tanstack/react-start/server-entry";
import type { Env } from "./worker";

export default withSupaCatch((env: Env) => ({ ingestKey: env.SUPACATCH_INGEST_KEY }), {
  fetch(request: Request) {
    return handler.fetch(request);
  },
});
```

The adapter waits for each Event submission before rethrowing the original failure. The client's `requestTimeout` therefore bounds the added failure-path latency. Capture failures never replace application failures, and the same `Error` passing through nested adapter layers is submitted once.

Exceptions consumed by an application error boundary or converted into an SSR error response before reaching these seams require manual `captureException` calls.

The SDK sends Events to `https://ingest.catch.supa.dev` by default. For Node.js, Bun, and Deno, you can override it when needed:

```ts
const supaCatch = SupaCatch.init({
  endpoint: "https://your-ingest.example.com",
  ingestKey,
});
```

For Cloudflare Workers, return the same `endpoint` option from the configuration function passed to `withSupaCatch` or `SupaCatch.withCatch`.

Fatal capture waits for delivery for at most two seconds and then preserves fatal termination. Call `SupaCatch.init` inside every worker or isolate that should capture failures.

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
  ingestKey,
  requestTimeout: 5_000,
});

const eventId = await supaCatch.captureException(new Error("Example failure"));
```

`captureException` accepts `unknown`, performs exactly one request, and resolves with the Event ID only after the ingest endpoint returns a valid `202` response. It never retries.

## Effect

```ts
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { layer, SupaCatch } from "@supainc/supacatch-js/effect";

const ingestKey = process.env.SUPACATCH_INGEST_KEY;
if (!ingestKey) throw new Error("SUPACATCH_INGEST_KEY is required");

const program = Effect.gen(function* () {
  const supaCatch = yield* SupaCatch;
  return yield* supaCatch.captureException(new Error("Example failure"));
}).pipe(Effect.provide(layer({ ingestKey }).pipe(Layer.provide(FetchHttpClient.layer))));
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
}).pipe(Effect.provide(layer({ ingestKey })));

await Effect.runPromise(program);
```

The runtime Layer removes its global handlers and TanStack automatic capture registration when its scope closes.

## Privacy and delivery semantics

SupaCatch sends exception names, messages, raw stack strings, and capture timestamps. This release has no redaction hook or source-map processing. Never place an Ingest Key in logs, client-side bundles, or public configuration.

A successful capture means the ingest endpoint accepted the Event into its queue. It does not mean downstream grouping or storage has completed.

## Compatibility

- Node.js 20.19 or newer maintained releases
- Bun 1.3 or newer
- Deno 2.x
- Cloudflare Workers
- ESM only
