import {
  createClient,
  InvalidConfigurationError,
  type CaptureError,
  type EventId,
  type SdkConfig,
} from "@supainc/supacatch-core";
import { Context, Effect, Layer } from "effect";

export class SupaCatch extends Context.Service<
  SupaCatch,
  {
    readonly captureException: (value: unknown) => Effect.Effect<EventId, CaptureError>;
  }
>()("@supainc/supacatch-effect/SupaCatch") {}

export const layer = (config: SdkConfig): Layer.Layer<SupaCatch, InvalidConfigurationError> =>
  Layer.scoped(
    SupaCatch,
    Effect.acquireRelease(
      Effect.try({
        try: () => createClient(config),
        catch: (cause) =>
          cause instanceof InvalidConfigurationError
            ? cause
            : new InvalidConfigurationError({ issue: "client initialization failed" }),
      }),
      (client) => Effect.sync(client.dispose),
    ).pipe(
      Effect.map((client) =>
        SupaCatch.of({
          captureException: (value) =>
            Effect.tryPromise({
              try: () => client.captureException(value),
              catch: (cause) => cause as CaptureError,
            }),
        }),
      ),
    ),
  );

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
