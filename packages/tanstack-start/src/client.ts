import type { SdkConfig, SupaCatchClient } from "@supainc/supacatch-core";
import { captureAutomatic } from "@supainc/supacatch-core/adapter";
import { init as initBrowser } from "@supainc/supacatch-browser";
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

/** Browser no-op for the server-only request middleware. */
export const supaCatchGlobalRequestMiddleware: SupaCatchRequestMiddleware = {
  "~types": undefined as unknown as SupaCatchRequestMiddleware["~types"],
  _types: undefined as unknown as SupaCatchRequestMiddleware["_types"],
  options: {},
};

/** Captures failures escaping TanStack Start Server Function client middleware. */
export const supaCatchGlobalFunctionMiddleware: SupaCatchFunctionMiddleware = {
  "~types": undefined as unknown as SupaCatchFunctionMiddleware["~types"],
  _types: undefined as unknown as SupaCatchFunctionMiddleware["_types"],
  options: { client: captureMiddlewareException },
};

/** Browser no-op for the server entry wrapper. */
export function withSupaCatch<Entry extends TanStackServerEntry>(serverEntry: Entry): Entry;
export function withSupaCatch<Env, Entry extends TanStackServerEntry>(
  config: (env: Env) => SdkConfig,
  serverEntry: Entry,
): Entry;
export function withSupaCatch<Env, Entry extends TanStackServerEntry>(
  ...args: [Entry] | [(env: Env) => SdkConfig, Entry]
): Entry {
  return args.length === 1 ? args[0] : args[1];
}

/** Registers browser `error` / `unhandledrejection` capture for the TanStack client. */
export const init = (config: SdkConfig): SupaCatchClient => initBrowser(config);

export type { SdkConfig, SupaCatchClient } from "@supainc/supacatch-core";
export type {
  SupaCatchFunctionMiddleware,
  SupaCatchRequestMiddleware,
  TanStackServerEntry,
} from "./types.js";
