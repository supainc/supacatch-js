import { Cause, Effect, Layer, ManagedRuntime, Option } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import type { SdkConfig } from "./config.js";
import { resolveConfig } from "./config.js";
import { layerResolved, SupaCatch } from "./effect.js";
import { TransportError } from "./errors.js";
import type { EventId } from "./event.js";

export interface SupaCatchClient {
  readonly captureException: (value: unknown) => Promise<EventId>;
  readonly dispose: () => void;
}

const captureException = Effect.fn("SupaCatch.client.captureException")(
  function* (value: unknown) {
    const supaCatch = yield* SupaCatch;
    return yield* supaCatch.captureException(value);
  },
  Effect.catchCause((cause) =>
    Option.match(Cause.findErrorOption(cause), {
      onSome: Effect.fail,
      onNone: () => Effect.fail(new TransportError({ cause: Cause.pretty(cause) })),
    }),
  ),
);

export const createClient = (config: SdkConfig): SupaCatchClient => {
  const resolved = Effect.runSync(resolveConfig(config));
  const runtime = ManagedRuntime.make(
    layerResolved(resolved).pipe(Layer.provide(FetchHttpClient.layer)),
  );
  return {
    captureException: (value) => runtime.runPromise(captureException(value)),
    dispose: () => void runtime.dispose(),
  };
};
