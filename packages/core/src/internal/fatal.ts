export interface FatalAdapterShape {
  readonly install: (onFatal: (value: unknown) => boolean) => () => void;
  readonly onFirstFatal: (value: unknown) => void;
  readonly finishFatal: (value: unknown) => void;
  readonly finishDuplicateFatal: (value: unknown) => void;
}

interface ActiveRegistration {
  readonly token: symbol;
  readonly deactivate: () => void;
}

const fatalDeliveryDeadline = 2_000;
let activeGlobalHandlerRegistration: ActiveRegistration | undefined;

export const beforeFatal = async (capture: Promise<unknown>): Promise<void> => {
  await Promise.race([
    capture.catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, fatalDeliveryDeadline)),
  ]);
};

export const installFatalCapture = (
  capture: (value: unknown) => Promise<void>,
  adapter: FatalAdapterShape,
): (() => void) => {
  const token = Symbol("SupaCatchFatalCapture");
  let handlingFatal = false;

  const removeHandlers = adapter.install((value) => {
    if (handlingFatal) {
      adapter.finishDuplicateFatal(value);
      return false;
    }
    handlingFatal = true;

    try {
      adapter.onFirstFatal(value);
    } catch {
      // Fatal capture must continue even when reporting the original value fails.
    }
    void capture(value).finally(() => adapter.finishFatal(value));
    return true;
  });

  let deactivated = false;
  const deactivate = (): void => {
    if (deactivated) return;
    deactivated = true;
    removeHandlers();
  };

  const previous = activeGlobalHandlerRegistration;
  activeGlobalHandlerRegistration = { token, deactivate };
  previous?.deactivate();

  return () => {
    if (activeGlobalHandlerRegistration?.token !== token) return;
    activeGlobalHandlerRegistration = undefined;
    deactivate();
  };
};
