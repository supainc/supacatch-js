import { AsyncLocalStorage } from "node:async_hooks";
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
  if (context !== undefined) await once(value, context, context.capture(value));
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
