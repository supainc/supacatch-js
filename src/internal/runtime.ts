import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import type { SdkConfig } from "../config.js";
import type { InvalidConfigurationError } from "../errors.js";
import { layer as supaCatchLayer, SupaCatch } from "../effect.js";
import { createClient, type SupaCatchClient } from "../client.js";
import {
  captureBeforeFatal,
  FatalAdapter,
  type FatalAdapterShape,
  installFatalCapture,
  installFatalCaptureScoped,
} from "./fatal.js";

export const init = (config: SdkConfig, adapter: FatalAdapterShape): SupaCatchClient => {
  const client = createClient(config);
  const removeHandlers = Effect.runSync(
    installFatalCapture((value) =>
      captureBeforeFatal(Effect.tryPromise(() => client.captureException(value))),
    ).pipe(Effect.provideService(FatalAdapter, adapter)),
  );

  return {
    captureException: client.captureException,
    dispose: () => {
      removeHandlers();
      client.dispose();
    },
  };
};

export const layer = (
  config: SdkConfig,
  adapter: FatalAdapterShape,
): Layer.Layer<SupaCatch, InvalidConfigurationError> =>
  Layer.effect(
    SupaCatch,
    Effect.gen(function* () {
      const service = yield* SupaCatch;
      yield* installFatalCaptureScoped((value) =>
        captureBeforeFatal(service.captureException(value)),
      );
      return service;
    }).pipe(Effect.provideService(FatalAdapter, adapter)),
  ).pipe(Layer.provide(supaCatchLayer(config)), Layer.provide(FetchHttpClient.layer));
