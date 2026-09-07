# `@supainc/supacatch-effect`

Effect service and runtime adapter contract for the SupaCatch JavaScript SDKs.

```sh
npm install @supainc/supacatch-effect@alpha effect@4.0.0-beta.103
```

```ts
import { Effect } from "effect";
import { layer, SupaCatch } from "@supainc/supacatch-effect";

const program = Effect.gen(function* () {
  const supaCatch = yield* SupaCatch;
  return yield* supaCatch.captureException(new Error("Example failure"));
}).pipe(Effect.provide(layer({ ingestKey: "sck_example_key" })));
```

Use `@supainc/supacatch-effect/adapter` only when you build a SupaCatch runtime
integration. Application code should use its runtime package.

See the [SupaCatch JavaScript SDK documentation](https://github.com/supainc/supacatch-js#readme)
for runtime setup and delivery behavior.
