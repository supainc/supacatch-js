import {
  createClient,
  type InvalidConfigurationError,
  type SdkConfig,
  type SupaCatchClient,
} from "@supainc/supacatch-core";
import { Effect, Layer } from "effect";
import { layer as supaCatchLayer, SupaCatch } from "../index.js";
import { registerAutomatic } from "./automatic.js";
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

  const deactivateClient = registerAutomatic((value) =>
    Effect.tryPromise(() => client.captureException(value)),
  );
  return {
    captureException: client.captureException,
    dispose: () => {
      deactivateClient();
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
      yield* Effect.acquireRelease(
        Effect.sync(() => registerAutomatic(service.captureException)),
        (deactivate) => Effect.sync(deactivate),
      );
      yield* installFatalCaptureScoped((value) =>
        captureBeforeFatal(service.captureException(value)),
      );
      return service;
    }).pipe(Effect.provideService(FatalAdapter, adapter)),
  ).pipe(Layer.provide(supaCatchLayer(config)));
