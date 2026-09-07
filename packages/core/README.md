# `@supainc/supacatch-core`

Shared Promise client and capture protocol for the SupaCatch JavaScript SDKs.

```sh
npm install @supainc/supacatch-core@alpha
```

```ts
import { createClient } from "@supainc/supacatch-core";

const supaCatch = createClient({
  ingestKey: "sck_example_key",
});

const eventId = await supaCatch.captureException(new Error("Example failure"));
```

The package uses standard Web APIs and has no Effect dependency or peer dependency.
Install `@supainc/supacatch-effect` separately when an application needs the Effect service.

See the [SupaCatch JavaScript SDK documentation](https://github.com/supainc/supacatch-js#readme) for usage.
