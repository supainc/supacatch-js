import { Effect, MutableRef, Option } from "effect";
import { installContext, type Capture, type CaptureContext } from "./context.js";
import { once } from "./dedupe.js";

interface Registration {
  readonly context: CaptureContext;
  readonly token: symbol;
}

interface RequestStore {
  readonly getStore: () => CaptureContext | undefined;
  readonly run: <Result>(context: CaptureContext, task: () => Result) => Result;
}

interface AsyncLocalStorageLike<Value> {
  getStore(): Value | undefined;
  run<Result>(store: Value, callback: () => Result): Result;
}

interface AsyncLocalStorageConstructor {
  new <Value>(): AsyncLocalStorageLike<Value>;
}

const loadAsyncLocalStorage = (): AsyncLocalStorageConstructor | undefined => {
  try {
    const getBuiltinModule = (
      globalThis as {
        process?: { getBuiltinModule?: (id: string) => { AsyncLocalStorage?: unknown } };
      }
    ).process?.getBuiltinModule;
    if (typeof getBuiltinModule !== "function") return undefined;
    const AsyncLocalStorage = getBuiltinModule("async_hooks")?.AsyncLocalStorage;
    return typeof AsyncLocalStorage === "function"
      ? (AsyncLocalStorage as AsyncLocalStorageConstructor)
      : undefined;
  } catch {
    return undefined;
  }
};

const createRequestStore = (): RequestStore => {
  const AsyncLocalStorage = loadAsyncLocalStorage();
  if (AsyncLocalStorage !== undefined) {
    const storage = new AsyncLocalStorage<CaptureContext>();
    return {
      getStore: () => storage.getStore(),
      run: (context, task) => storage.run(context, task),
    };
  }

  let current: CaptureContext | undefined;
  return {
    getStore: () => current,
    run: (context, task) => {
      const previous = current;
      current = context;
      try {
        return task();
      } finally {
        current = previous;
      }
    },
  };
};

const requestContext = createRequestStore();
const runtimeCapture = MutableRef.make(Option.none<Registration>());

installContext((context, task) => requestContext.run(context, task));

export const captureAutomatic = (value: unknown): Effect.Effect<void, unknown> =>
  Effect.suspend(() => {
    const context = Option.fromNullishOr(requestContext.getStore()).pipe(
      Option.orElse(() =>
        Option.map(MutableRef.get(runtimeCapture), (registration) => registration.context),
      ),
    );
    return Option.match(context, {
      onNone: () => Effect.succeed(undefined),
      onSome: (current) => once(value, current, current.capture(value)),
    });
  });

export const registerAutomatic = (capture: Capture): (() => void) => {
  const registration: Registration = {
    context: { capture },
    token: Symbol("SupaCatchAutomaticCapture"),
  };
  MutableRef.set(runtimeCapture, Option.some(registration));

  return () => {
    const current = MutableRef.get(runtimeCapture);
    if (Option.exists(current, ({ token }) => token === registration.token)) {
      MutableRef.set(runtimeCapture, Option.none());
    }
  };
};
