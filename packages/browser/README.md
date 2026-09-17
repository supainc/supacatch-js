# `@supainc/supacatch-browser`

Automatic error capture for browsers.

```sh
npm install @supainc/supacatch-browser@alpha
```

```ts
import * as SupaCatch from "@supainc/supacatch-browser";

const ingestKey = import.meta.env.VITE_SUPACATCH_INGEST_KEY;
if (!ingestKey) throw new Error("VITE_SUPACATCH_INGEST_KEY is required");

const supaCatch = SupaCatch.init({ ingestKey, environment: "production" });
```

See the [SupaCatch JavaScript SDK documentation](https://github.com/supainc/supacatch-js#readme) for usage.
