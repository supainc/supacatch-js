import { AsyncLocalStorage } from "node:async_hooks";
import { appendFileSync } from "node:fs";
import { installContext, type Capture, type CaptureContext } from "./context.js";
import { once } from "./dedupe.js";

interface Registration {
  readonly context: CaptureContext;
  readonly token: symbol;
}

const requestContext = new AsyncLocalStorage<CaptureContext>();
let runtimeCapture: Registration | undefined;

installContext((context, task) => requestContext.run(context, task));

export const captureAutomatic = async (value: unknown): Promise<void> => {
  const context = requestContext.getStore() ?? runtimeCapture?.context;
  if (context === undefined) {
    // #region agent log
    appendFileSync(
      "/opt/cursor/logs/debug.log",
      JSON.stringify({
        location: "automatic.ts:captureAutomatic:no-context",
        message: "no capture context; skipping",
        data: {},
        timestamp: Date.now(),
        hypothesisId: "E",
      }) + "\n",
    );
    // #endregion
    return;
  }
  // #region agent log
  const __src = requestContext.getStore() !== undefined ? "als" : "runtime";
  appendFileSync(
    "/opt/cursor/logs/debug.log",
    JSON.stringify({
      location: "automatic.ts:captureAutomatic:before-once",
      message: "passing lazy () => context.capture(value) to once()",
      data: {
        source: __src,
        valueMessage: value instanceof Error ? value.message : typeof value,
      },
      timestamp: Date.now(),
      hypothesisId: "A",
      runId: "post-fix",
    }) + "\n",
  );
  // #endregion
  await once(value, context, () => context.capture(value));
};

export const registerAutomatic = (capture: Capture): (() => void) => {
  const registration: Registration = {
    context: { capture },
    token: Symbol("SupaCatchAutomaticCapture"),
  };
  runtimeCapture = registration;

  return () => {
    if (runtimeCapture?.token === registration.token) runtimeCapture = undefined;
  };
};
