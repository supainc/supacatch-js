import { Context, Effect, Layer } from "effect";
import { HttpClient } from "effect/unstable/http";
import { captureWith } from "./capture.js";
import type { SdkConfig } from "./config.js";
import { resolveConfig } from "./config.js";
import type { CaptureError, InvalidConfigurationError } from "./errors.js";
import type { EventId } from "./event.js";

export class SupaCatch extends Context.Service<
  SupaCatch,
  {
    readonly captureException: (value: unknown) => Effect.Effect<EventId, CaptureError>;
  }
>()("@supainc/supacatch-core/SupaCatch") {}

export const layer = (
  config: SdkConfig,
): Layer.Layer<SupaCatch, InvalidConfigurationError, HttpClient.HttpClient> =>
  Layer.effect(
    SupaCatch,
    Effect.gen(function* () {
      const resolved = yield* resolveConfig(config);
      const httpClient = yield* HttpClient.HttpClient;

      return SupaCatch.of({
        captureException: (value) => captureWith(httpClient, resolved, value),
      });
    }),
  );

export type { SdkConfig } from "./config.js";
export * from "./errors.js";
export { EventId, EventRequest, SubmitEventResponse } from "./event.js";
