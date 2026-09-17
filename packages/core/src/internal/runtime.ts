import { Effect } from "effect";
import type { SdkConfig } from "../config.js";
import { createClient, type SupaCatchClient } from "../client.js";
import { registerAutomatic } from "./automatic.js";
import {
  captureBeforeFatal,
  FatalAdapter,
  type FatalAdapterShape,
  installFatalCapture,
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
