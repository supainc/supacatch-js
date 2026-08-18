import { Effect } from "effect";
import { createClient, type SupaCatchClient } from "./client.js";
import type { SdkConfig } from "./config.js";
import { captureBeforeFatal } from "./internal/fatal.js";

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
): Omit<Worker, "fetch"> & CloudflareWorker<Env> => {
  let client: SupaCatchClient | undefined;

  return {
    ...worker,
    fetch: async (request, env, context) => {
      try {
        return await worker.fetch(request, env, context);
      } catch (error) {
        try {
          const activeClient = (client ??= createClient(config(env)));
          await captureBeforeFatal(Effect.tryPromise(() => activeClient.captureException(error)));
        } catch {
          // Automatic capture must never replace the original Worker exception.
        }
        throw error;
      }
    },
  };
};

export type { SdkConfig } from "./config.js";
export type { SupaCatchClient } from "./client.js";
export * from "./errors.js";
export { EventId, EventRequest, SubmitEventResponse } from "./event.js";
