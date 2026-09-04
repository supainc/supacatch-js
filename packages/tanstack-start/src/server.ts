import type { SdkConfig } from "@supainc/supacatch-core";
import { captureAutomatic } from "@supainc/supacatch-core/adapter";
import { withCatch, type CloudflareWorker } from "@supainc/supacatch-cloudflare";
import { Effect } from "effect";
import type {
  SupaCatchFunctionMiddleware,
  SupaCatchRequestMiddleware,
  TanStackServerEntry,
} from "./types.js";

type MiddlewareContext = {
  readonly next: () => unknown;
};

const captureException = (value: unknown): Promise<void> =>
  Effect.runPromise(captureAutomatic(value).pipe(Effect.ignoreCause));

const captureMiddlewareException = async ({ next }: MiddlewareContext): Promise<unknown> => {
  try {
    return await next();
  } catch (error) {
    await captureException(error);
    throw error;
  }
};

/** Captures failures escaping TanStack Start request middleware. */
export const supaCatchGlobalRequestMiddleware: SupaCatchRequestMiddleware = {
  "~types": undefined as unknown as SupaCatchRequestMiddleware["~types"],
  _types: undefined as unknown as SupaCatchRequestMiddleware["_types"],
  options: { server: captureMiddlewareException },
};

/** Captures failures escaping TanStack Start Server Function middleware. */
export const supaCatchGlobalFunctionMiddleware: SupaCatchFunctionMiddleware = {
  "~types": undefined as unknown as SupaCatchFunctionMiddleware["~types"],
  _types: undefined as unknown as SupaCatchFunctionMiddleware["_types"],
  options: { server: captureMiddlewareException },
};

const wrapServerEntry = <Entry extends TanStackServerEntry>(serverEntry: Entry): Entry => ({
  ...serverEntry,
  fetch: new Proxy(serverEntry.fetch, {
    apply: async (target, thisArgument, argumentsList) => {
      try {
        return await Reflect.apply(target, thisArgument, argumentsList);
      } catch (error) {
        await captureException(error);
        throw error;
      }
    },
  }),
});

/** Captures failures escaping a TanStack Start server entry. Pass a config function for Cloudflare Workers. */
export function withSupaCatch<Entry extends TanStackServerEntry>(serverEntry: Entry): Entry;
export function withSupaCatch<Env, Entry extends TanStackServerEntry>(
  config: (env: Env) => SdkConfig,
  serverEntry: Entry,
): Omit<Entry, "fetch"> & CloudflareWorker<Env>;
export function withSupaCatch<Env, Entry extends TanStackServerEntry>(
  ...args: [Entry] | [(env: Env) => SdkConfig, Entry]
): Entry | (Omit<Entry, "fetch"> & CloudflareWorker<Env>) {
  if (args.length === 1) {
    return wrapServerEntry(args[0]);
  }
  const [config, serverEntry] = args;
  return withCatch(config, wrapServerEntry(serverEntry));
}

export type {
  SupaCatchFunctionMiddleware,
  SupaCatchRequestMiddleware,
  TanStackServerEntry,
} from "./types.js";
