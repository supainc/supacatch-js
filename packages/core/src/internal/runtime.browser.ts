import { Effect } from "effect";
import type { SdkConfig } from "../config.js";
import { createClient, type SupaCatchClient } from "../client.js";
import { registerAutomatic } from "./automatic.js";
import { FatalAdapter, type FatalAdapterShape, installContinuousCapture } from "./fatal.js";

export const init = (config: SdkConfig, adapter: FatalAdapterShape): SupaCatchClient => {
  const client = createClient(config);
  const removeHandlers = Effect.runSync(
    installContinuousCapture((value) =>
      client.captureException(value).then(
        () => undefined,
        () => undefined,
      ),
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
