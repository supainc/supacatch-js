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
  // `never` accepts deployment-specific fetch parameter lists while preserving inference on Entry.
  readonly fetch: (...arguments_: ReadonlyArray<never>) => Response | Promise<Response>;
};
