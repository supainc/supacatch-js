import { Cause, Effect, Layer, ManagedRuntime, Option } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import type { SdkConfig } from "./config.js";
import { layer, SupaCatch } from "./effect.js";
import { TransportError } from "./errors.js";
import type { EventId } from "./event.js";

export interface SupaCatchClient {
  readonly captureException: (value: unknown) => Promise<EventId>;
  readonly dispose: () => void;
}

export const createClient = (config: SdkConfig): SupaCatchClient => {
  const runtime = ManagedRuntime.make(layer(config).pipe(Layer.provide(FetchHttpClient.layer)));
  return {
    captureException: (value) =>
      runtime.runPromise(
        Effect.flatMap(SupaCatch, (supaCatch) => supaCatch.captureException(value)).pipe(
          Effect.catchCause((cause) =>
            Option.match(Cause.findErrorOption(cause), {
              onSome: Effect.fail,
              onNone: () => Effect.fail(new TransportError({ cause: Cause.pretty(cause) })),
            }),
          ),
        ),
      ),
    dispose: () => void runtime.dispose(),
  };
};
