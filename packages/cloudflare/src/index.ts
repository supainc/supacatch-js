import { createClient, type SdkConfig, type SupaCatchClient } from "@supainc/supacatch-core";
import {
  beforeFatal,
  once,
  runWithContext,
  type CaptureContext,
} from "@supainc/supacatch-core/adapter";
import { Effect, MutableRef, Option } from "effect";

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
  fetch: (request, env, context) => {
    const client = MutableRef.make(Option.none<SupaCatchClient>());
    const capture = (value: unknown) =>
      Effect.suspend(() => {
        const current = Option.getOrElse(MutableRef.get(client), () => {
          const created = createClient(config(env));
          MutableRef.set(client, Option.some(created));
          return created;
        });
        return Effect.tryPromise(() => current.captureException(value));
      });

    const captureContext: CaptureContext = { capture };
    const handle = Effect.tryPromise({
      try: () => Promise.resolve(worker.fetch(request, env, context)),
      catch: (error) => error,
    }).pipe(
      Effect.tapError((error) => beforeFatal(once(error, captureContext, capture(error)))),
      Effect.ensuring(
        Effect.sync(() =>
          Option.match(MutableRef.get(client), {
            onNone: () => undefined,
            onSome: (current) => current.dispose(),
          }),
        ).pipe(Effect.ignoreCause),
      ),
    );
    return runWithContext(captureContext, () => Effect.runPromise(handle));
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
  EventId,
  EventRequest,
  SubmitEventResponse,
} from "@supainc/supacatch-core";
