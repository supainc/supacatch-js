import type { SupaCatchClient } from "./client.js";

type RequestMiddlewareTypes = {
  readonly type: "request";
  readonly middlewares: undefined;
  readonly allInput: undefined;
  readonly allOutput: undefined;
  readonly serverContext: undefined;
  readonly allServerContext: undefined;
};

type FunctionMiddlewareTypes = {
  readonly type: "function";
  readonly middlewares: undefined;
  readonly input: undefined;
  readonly allInput: undefined;
  readonly output: undefined;
  readonly allOutput: undefined;
  readonly clientContext: undefined;
  readonly allClientContextBeforeNext: undefined;
  readonly allClientContextAfterNext: undefined;
  readonly serverContext: undefined;
  readonly serverSendContext: undefined;
  readonly allServerSendContext: undefined;
  readonly allServerContext: undefined;
  readonly clientSendContext: undefined;
  readonly allClientSendContext: undefined;
  readonly validator: undefined;
  readonly inputValidator: undefined;
};

type MiddlewareContext = {
  readonly next: () => unknown;
};

type TanStackMiddlewareOptions = {
  // TanStack Start changes the concrete handler types as middleware context is inferred.
  // `any` keeps this structural adapter compatible without a runtime framework dependency.
  readonly server?: (...arguments_: Array<any>) => any;
};

export type SupaCatchRequestMiddleware = {
  readonly "~types": RequestMiddlewareTypes;
  readonly _types: RequestMiddlewareTypes;
  readonly options: TanStackMiddlewareOptions;
};

export type SupaCatchFunctionMiddleware = {
  readonly "~types": FunctionMiddlewareTypes;
  readonly _types: FunctionMiddlewareTypes;
  readonly options: TanStackMiddlewareOptions;
};

export type TanStackServerEntry = {
  readonly fetch: (request: Request, options?: unknown) => Response | Promise<Response>;
};

const activeCaptures = new WeakSet<object>();

const captureOnce = async (client: SupaCatchClient, value: unknown): Promise<void> => {
  const key =
    (typeof value === "object" && value !== null) || typeof value === "function"
      ? value
      : undefined;
  if (key !== undefined) {
    if (activeCaptures.has(key)) return;
    activeCaptures.add(key);
  }

  try {
    await client.captureException(value);
  } catch {
    // Automatic capture must never replace the application exception.
  } finally {
    if (key !== undefined) {
      setTimeout(() => activeCaptures.delete(key), 0);
    }
  }
};

const captureMiddlewareException =
  (client: SupaCatchClient) =>
  async ({ next }: MiddlewareContext): Promise<unknown> => {
    try {
      return await next();
    } catch (error) {
      await captureOnce(client, error);
      throw error;
    }
  };

/** Captures failures escaping TanStack Start request middleware. */
export const supaCatchRequestMiddleware = (
  client: SupaCatchClient,
): SupaCatchRequestMiddleware => ({
  "~types": undefined as unknown as RequestMiddlewareTypes,
  _types: undefined as unknown as RequestMiddlewareTypes,
  options: { server: captureMiddlewareException(client) },
});

/** Captures failures escaping TanStack Start Server Function middleware. */
export const supaCatchFunctionMiddleware = (
  client: SupaCatchClient,
): SupaCatchFunctionMiddleware => ({
  "~types": undefined as unknown as FunctionMiddlewareTypes,
  _types: undefined as unknown as FunctionMiddlewareTypes,
  options: { server: captureMiddlewareException(client) },
});

/** Captures failures escaping a TanStack Start server entry and preserves its other properties. */
export const withSupaCatch = <Entry extends TanStackServerEntry>(
  serverEntry: Entry,
  client: SupaCatchClient,
): Omit<Entry, "fetch"> & TanStackServerEntry => ({
  ...serverEntry,
  fetch: async (request, options) => {
    try {
      return await serverEntry.fetch(request, options);
    } catch (error) {
      await captureOnce(client, error);
      throw error;
    }
  },
});

export type { SupaCatchClient } from "./client.js";
