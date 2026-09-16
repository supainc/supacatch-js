import { appendFileSync } from "node:fs";
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
      // #region agent log
      appendFileSync(
        "/opt/cursor/logs/debug.log",
        JSON.stringify({
          location: "cloudflare/index.ts:withCatch:catch",
          message: "withCatch catch; passing lazy () => capture(error) to once()",
          data: {
            errorMessage: error instanceof Error ? error.message : typeof error,
            clientInitialized: client !== undefined,
          },
          timestamp: Date.now(),
          hypothesisId: "A",
          runId: "post-fix",
        }) + "\n",
      );
      // #endregion
      await beforeFatal(once(error, captureContext, () => capture(error)));
      throw error;
    } finally {
      // #region agent log
      appendFileSync(
        "/opt/cursor/logs/debug.log",
        JSON.stringify({
          location: "cloudflare/index.ts:withCatch:finally",
          message: "dispose may abort in-flight/abandoned capture Promises",
          data: { willDispose: client !== undefined },
          timestamp: Date.now(),
          hypothesisId: "B",
          runId: "post-fix",
        }) + "\n",
      );
      // #endregion
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
