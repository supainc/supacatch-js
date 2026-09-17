import { Context, Duration, Effect, MutableRef, Option, type Scope } from "effect";

export interface FatalAdapterShape {
  readonly install: (onFatal: (value: unknown) => boolean) => () => void;
  readonly onFirstFatal: (value: unknown) => void;
  readonly finishFatal: (value: unknown) => void;
  readonly finishDuplicateFatal: (value: unknown) => void;
}

export class FatalAdapter extends Context.Service<FatalAdapter, FatalAdapterShape>()(
  "@supainc/supacatch-core/internal/FatalAdapter",
) {}

interface ActiveRegistration {
  readonly token: symbol;
  readonly deactivate: () => void;
}

const fatalDeliveryDeadline = Duration.seconds(2);

const activeGlobalHandlerRegistration = MutableRef.make(Option.none<ActiveRegistration>());

export const beforeFatal = (capture: Effect.Effect<unknown, unknown>): Effect.Effect<void> =>
  Effect.raceFirst(capture.pipe(Effect.ignoreCause), Effect.sleep(fatalDeliveryDeadline));

export const captureBeforeFatal = (capture: Effect.Effect<unknown, unknown>): Promise<void> =>
  Effect.runPromise(beforeFatal(capture));

export const installFatalCapture = Effect.fn("SupaCatch.installFatalCapture")(function* (
  capture: (value: unknown) => Promise<void>,
) {
  const adapter = yield* FatalAdapter;
  const token = Symbol("SupaCatchFatalCapture");
  const handlingFatal = MutableRef.make(false);

  const removeHandlers = adapter.install((value) => {
    if (!MutableRef.compareAndSet(handlingFatal, false, true)) {
      adapter.finishDuplicateFatal(value);
      return false;
    }

    Effect.runSync(Effect.sync(() => adapter.onFirstFatal(value)).pipe(Effect.ignoreCause));
    void capture(value).finally(() => adapter.finishFatal(value));
    return true;
  });

  const deactivated = MutableRef.make(false);
  const deactivate = (): void => {
    if (!MutableRef.compareAndSet(deactivated, false, true)) return;
    removeHandlers();
  };

  const previous = MutableRef.getAndSet(
    activeGlobalHandlerRegistration,
    Option.some({ token, deactivate }),
  );
  Option.match(previous, {
    onNone: () => undefined,
    onSome: (registration) => registration.deactivate(),
  });

  return () => {
    const isCurrent = Option.exists(
      MutableRef.get(activeGlobalHandlerRegistration),
      (registration) => registration.token === token,
    );
    if (!isCurrent) return;
    MutableRef.set(activeGlobalHandlerRegistration, Option.none());
    deactivate();
  };
});

export const installFatalCaptureScoped = (
  capture: (value: unknown) => Promise<void>,
): Effect.Effect<() => void, never, FatalAdapter | Scope.Scope> =>
  Effect.acquireRelease(installFatalCapture(capture), (dispose) => Effect.sync(dispose));
