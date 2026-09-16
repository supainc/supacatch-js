import type { SdkConfig } from "../config.js";
import { createClient, type SupaCatchClient } from "../client.js";
import { registerAutomatic } from "./automatic.js";
import { beforeFatal, type FatalAdapterShape, installFatalCapture } from "./fatal.js";

export const init = (config: SdkConfig, adapter: FatalAdapterShape): SupaCatchClient => {
  const client = createClient(config);
  const removeHandlers = installFatalCapture(
    (value) => beforeFatal(client.captureException(value)),
    adapter,
  );

  const deactivateClient = registerAutomatic((value) => client.captureException(value));
  return {
    captureException: client.captureException,
    dispose: () => {
      deactivateClient();
      removeHandlers();
      client.dispose();
    },
  };
};
