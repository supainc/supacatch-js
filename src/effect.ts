import { Context, Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import { captureWith } from "./capture.js";
import type { ResolvedConfig, SdkConfig } from "./config.js";
import { resolveConfig } from "./config.js";
import type { CaptureError, InvalidConfigurationError } from "./errors.js";
import type { EventId } from "./event.js";

export class SupaCatch extends Context.Service<
  SupaCatch,
  {
    readonly captureException: (value: unknown) => Effect.Effect<EventId, CaptureError>;
  }
>()("@supainc/supacatch-js/SupaCatch") {}

export const makeSupaCatchResolved = Effect.fn(function* (resolved: ResolvedConfig) {
  const httpClient = yield* HttpClient.HttpClient;
  return SupaCatch.of({
    captureException: (value) => captureWith(httpClient, resolved, value),
  });
});

export const makeSupaCatch = Effect.fn(function* (config: SdkConfig) {
  const resolved = yield* resolveConfig(config);
  return yield* makeSupaCatchResolved(resolved);
});

export const layerResolved = (
  resolved: ResolvedConfig,
): Layer.Layer<SupaCatch, never, HttpClient.HttpClient> =>
  Layer.effect(SupaCatch)(makeSupaCatchResolved(resolved));

export const layer = (
  config: SdkConfig,
): Layer.Layer<SupaCatch, InvalidConfigurationError, HttpClient.HttpClient> =>
  Layer.effect(SupaCatch)(makeSupaCatch(config));

export const layerFetch = (config: SdkConfig): Layer.Layer<SupaCatch, InvalidConfigurationError> =>
  layer(config).pipe(Layer.provide(FetchHttpClient.layer));

export type { SdkConfig } from "./config.js";
export * from "./errors.js";
export { EventId, EventRequest, SubmitEventResponse } from "./event.js";
