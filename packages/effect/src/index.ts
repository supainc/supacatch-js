import {
  CaptureTimeoutError,
  createClient,
  EventId,
  EventRequest,
  InvalidConfigurationError,
  InvalidSuccessResponseError,
  RejectedResponseError,
  RequestEncodingError,
  SubmitEventResponse,
  TransportError,
  UnavailableResponseError,
  UnexpectedResponseError,
} from "@supainc/supacatch-core";
import type { CaptureError, EventId as EventIdType, SdkConfig } from "@supainc/supacatch-core";
import { Context, Effect, Layer } from "effect";

export class SupaCatch extends Context.Service<
  SupaCatch,
  {
    readonly captureException: (value: unknown) => Effect.Effect<EventIdType, CaptureError>;
  }
>()("@supainc/supacatch-effect/SupaCatch") {}

export const layer = (config: SdkConfig): Layer.Layer<SupaCatch, InvalidConfigurationError> =>
  Layer.effect(
    SupaCatch,
    Effect.acquireRelease(
      Effect.try({
        try: () => createClient(config),
        catch: (cause) =>
          cause instanceof InvalidConfigurationError
            ? cause
            : new InvalidConfigurationError({
                issue: "SupaCatch client initialization failed",
              }),
      }),
      (client) => Effect.sync(client.dispose),
    ).pipe(
      Effect.map((client) =>
        SupaCatch.of({
          captureException: (value) =>
            Effect.tryPromise({
              try: () => client.captureException(value),
              catch: (cause) =>
                cause instanceof RequestEncodingError ||
                cause instanceof TransportError ||
                cause instanceof CaptureTimeoutError ||
                cause instanceof RejectedResponseError ||
                cause instanceof UnavailableResponseError ||
                cause instanceof UnexpectedResponseError ||
                cause instanceof InvalidSuccessResponseError
                  ? cause
                  : new TransportError({ cause }),
            }),
        }),
      ),
    ),
  );

export type { CaptureError, SdkConfig };
export {
  CaptureTimeoutError,
  EventId,
  EventRequest,
  InvalidConfigurationError,
  InvalidSuccessResponseError,
  RejectedResponseError,
  RequestEncodingError,
  SubmitEventResponse,
  TransportError,
  UnavailableResponseError,
  UnexpectedResponseError,
};
