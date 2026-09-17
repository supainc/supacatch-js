import { FatalAdapter } from "@supainc/supacatch-core/adapter";

type EventTargetLike = Pick<EventTarget, "addEventListener" | "removeEventListener">;

const eventTarget = (): EventTargetLike | undefined => {
  const candidate = globalThis as typeof globalThis & Partial<EventTargetLike>;
  return typeof candidate.addEventListener === "function" &&
    typeof candidate.removeEventListener === "function"
    ? candidate
    : undefined;
};

export const browserFatalAdapter = FatalAdapter.of({
  install: (onFatal) => {
    const target = eventTarget();
    if (target === undefined) return () => undefined;

    const onError = (event: Event): void => {
      const errorEvent = event as ErrorEvent;
      onFatal(errorEvent.error ?? errorEvent.message);
    };
    const onRejection = (event: Event): void => {
      onFatal((event as PromiseRejectionEvent).reason);
    };

    target.addEventListener("error", onError);
    target.addEventListener("unhandledrejection", onRejection);

    return () => {
      target.removeEventListener("error", onError);
      target.removeEventListener("unhandledrejection", onRejection);
    };
  },
  onFirstFatal: (value) => console.error(value),
  finishFatal: () => undefined,
  finishDuplicateFatal: () => undefined,
});
