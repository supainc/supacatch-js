import { Effect } from "effect";
import type { SdkConfig } from "../config.js";
import { createClient, type SupaCatchClient } from "../client.js";
import { registerAutomatic } from "./automatic.js";
import {
  captureBeforeFatal,
  FatalAdapter,
  type FatalAdapterShape,
  installContinuousCapture,
  installFatalCapture,
} from "./fatal.js";

export type RuntimeCapturePolicy = "fatal" | "continuous";

export const init = (
  config: SdkConfig,
  adapter: FatalAdapterShape,
  policy: RuntimeCapturePolicy = "fatal",
): SupaCatchClient => {
  const client = createClient(config);

  let install: Effect.Effect<() => void, never, FatalAdapter>;
  switch (policy) {
    case "continuous":
      install = installContinuousCapture((value) =>
        client.captureException(value).then(
          () => undefined,
          () => undefined,
        ),
      );
      break;
    case "fatal":
      install = installFatalCapture((value) =>
        captureBeforeFatal(Effect.tryPromise(() => client.captureException(value))),
      );
      break;
    default: {
      const _exhaustive: never = policy;
      throw new Error(`unexpected capture policy: ${String(_exhaustive)}`);
    }
  }

  const removeHandlers = Effect.runSync(install.pipe(Effect.provideService(FatalAdapter, adapter)));

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
