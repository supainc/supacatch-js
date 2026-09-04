import type { SdkConfig } from "@supainc/supacatch";
import type {
  SupaCatchFunctionMiddleware,
  SupaCatchRequestMiddleware,
  TanStackServerEntry,
} from "./types.js";

/** Browser no-op for the server-only request middleware. */
export const supaCatchGlobalRequestMiddleware: SupaCatchRequestMiddleware = {
  "~types": undefined as unknown as SupaCatchRequestMiddleware["~types"],
  _types: undefined as unknown as SupaCatchRequestMiddleware["_types"],
  options: {},
};

/** Browser no-op for the server-only Server Function middleware. */
export const supaCatchGlobalFunctionMiddleware: SupaCatchFunctionMiddleware = {
  "~types": undefined as unknown as SupaCatchFunctionMiddleware["~types"],
  _types: undefined as unknown as SupaCatchFunctionMiddleware["_types"],
  options: {},
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

export type {
  SupaCatchFunctionMiddleware,
  SupaCatchRequestMiddleware,
  TanStackServerEntry,
} from "./types.js";
