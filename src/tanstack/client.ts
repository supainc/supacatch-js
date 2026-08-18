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
export const withSupaCatch = <Entry extends TanStackServerEntry>(serverEntry: Entry): Entry =>
  serverEntry;

export type {
  SupaCatchFunctionMiddleware,
  SupaCatchRequestMiddleware,
  TanStackServerEntry,
} from "./types.js";
