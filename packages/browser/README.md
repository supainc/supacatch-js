# `@supainc/supacatch-browser`

Automatic error capture for browsers.

```sh
npm install @supainc/supacatch-browser@alpha
```

Use a browser public key. Never put a server Ingest Key in client-side code.

```ts
import * as SupaCatch from "@supainc/supacatch-browser";

const publicKey = import.meta.env.VITE_SUPACATCH_PUBLIC_KEY;
if (!publicKey) throw new Error("VITE_SUPACATCH_PUBLIC_KEY is required");

const supaCatch = SupaCatch.init({ publicKey, environment: "production" });
```

See the [SupaCatch JavaScript SDK documentation](https://github.com/supainc/supacatch-js#readme) for usage.
