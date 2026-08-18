import { Effect } from "effect";
import { captureAutomatic } from "../internal/automatic.js";
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

/** Captures failures escaping a TanStack Start server entry and preserves its other properties. */
export const withSupaCatch = <Entry extends TanStackServerEntry>(serverEntry: Entry): Entry => ({
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

export type {
  SupaCatchFunctionMiddleware,
  SupaCatchRequestMiddleware,
  TanStackServerEntry,
} from "./types.js";
