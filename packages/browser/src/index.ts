import { createClient, type SdkConfig, type SupaCatchClient } from "@supainc/supacatch-core";
import {
  FatalAdapter,
  installContinuousCapture,
  registerAutomatic,
} from "@supainc/supacatch-core/adapter";
import { Effect } from "effect";
import { browserFatalAdapter } from "./window-adapter.js";

export const init = (config: SdkConfig): SupaCatchClient => {
  const client = createClient(config);
  const removeHandlers = Effect.runSync(
    installContinuousCapture((value) =>
      client.captureException(value).then(
        () => undefined,
        () => undefined,
      ),
    ).pipe(Effect.provideService(FatalAdapter, browserFatalAdapter)),
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

export type { SdkConfig, SupaCatchClient } from "@supainc/supacatch-core";
export {
  CaptureTimeoutError,
  InvalidConfigurationError,
  InvalidSuccessResponseError,
  RejectedResponseError,
  RequestEncodingError,
  TransportError,
  UnavailableResponseError,
  UnexpectedResponseError,
  type CaptureError,
  type EventEnvironment,
  type EventId,
  type EventRequest,
  type SubmitEventResponse,
} from "@supainc/supacatch-core";
