import { createClient, type SdkConfig, type SupaCatchClient } from "@supainc/supacatch-core";
import {
  beforeFatal,
  once,
  runWithContext,
  type CaptureContext,
} from "@supainc/supacatch-core/adapter";

export interface CloudflareExecutionContext {
  readonly waitUntil: (promise: Promise<unknown>) => void;
  readonly passThroughOnException: () => void;
}

export type CloudflareFetchHandler<Env> = (
  request: Request,
  env: Env,
  context: CloudflareExecutionContext,
) => Response | Promise<Response>;

export interface CloudflareWorker<Env> {
  readonly fetch: CloudflareFetchHandler<Env>;
}

export const withCatch = <Env, Worker extends CloudflareWorker<Env> = CloudflareWorker<Env>>(
  config: (env: Env) => SdkConfig,
  worker: Worker,
): Omit<Worker, "fetch"> & CloudflareWorker<Env> => ({
  ...worker,
  fetch: async (request, env, context) => {
    let client: SupaCatchClient | undefined;
    const capture = (value: unknown): Promise<unknown> => {
      client ??= createClient(config(env));
      return client.captureException(value);
    };

    const captureContext: CaptureContext = { capture };
    try {
      return await runWithContext(captureContext, () =>
        Promise.resolve(worker.fetch(request, env, context)),
      );
    } catch (error) {
      await beforeFatal(once(error, captureContext, () => capture(error)));
      throw error;
    } finally {
      client?.dispose();
    }
  },
});

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
