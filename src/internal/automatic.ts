import { AsyncLocalStorage } from "node:async_hooks";
import { Effect, MutableRef, Option } from "effect";
import { installContext, type Capture, type CaptureContext } from "./context.js";
import { once } from "./dedupe.js";

interface Registration {
  readonly context: CaptureContext;
  readonly token: symbol;
}

const requestContext = new AsyncLocalStorage<CaptureContext>();
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
