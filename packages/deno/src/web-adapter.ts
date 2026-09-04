import { FatalAdapter } from "@supainc/supacatch/internal/fatal";

export const webFatalAdapter = FatalAdapter.of({
  install: (onFatal) => {
    const onError = (event: ErrorEvent): void => {
      if (onFatal(event.error ?? event.message)) event.preventDefault();
    };
    const onRejection = (event: PromiseRejectionEvent): void => {
      if (onFatal(event.reason)) event.preventDefault();
    };

    globalThis.addEventListener("error", onError);
    globalThis.addEventListener("unhandledrejection", onRejection);

    return () => {
      globalThis.removeEventListener("error", onError);
      globalThis.removeEventListener("unhandledrejection", onRejection);
    };
  },
  onFirstFatal: () => undefined,
  finishFatal: (value) => {
    globalThis.queueMicrotask(() => {
      throw value;
    });
  },
  finishDuplicateFatal: () => undefined,
});
