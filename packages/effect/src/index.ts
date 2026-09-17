import {
  InvalidConfigurationError,
  type CaptureError,
  type EventId,
  type SdkConfig,
} from "@supainc/supacatch-core";
import { layer as coreLayer, SupaCatch as CoreSupaCatch } from "@supainc/supacatch-core/effect";
import { Context, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

export class SupaCatch extends Context.Service<
  SupaCatch,
  {
    readonly captureException: (value: unknown) => Effect.Effect<EventId, CaptureError>;
  }
>()("@supainc/supacatch-effect/SupaCatch") {}

export const layer = (config: SdkConfig): Layer.Layer<SupaCatch, InvalidConfigurationError> =>
  Layer.effect(
    SupaCatch,
    Effect.gen(function* () {
      const inner = yield* CoreSupaCatch;
      return SupaCatch.of({
        captureException: (value) => inner.captureException(value),
      });
    }),
  ).pipe(Layer.provide(coreLayer(config)), Layer.provide(FetchHttpClient.layer));

export type {
  CaptureError,
  EventEnvironment,
  EventId,
  EventRequest,
  SdkConfig,
  SubmitEventResponse,
  SupaCatchClient,
} from "@supainc/supacatch-core";
export {
  CaptureTimeoutError,
  InvalidConfigurationError,
  InvalidSuccessResponseError,
  RejectedResponseError,
  RequestEncodingError,
  TransportError,
  UnavailableResponseError,
  UnexpectedResponseError,
} from "@supainc/supacatch-core";
