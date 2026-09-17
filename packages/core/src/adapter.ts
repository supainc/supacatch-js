import { AsyncLocalStorage } from "node:async_hooks";
import {
  captureAutomatic,
  installRequestContext,
  registerAutomatic,
} from "./internal/automatic.js";
import type { CaptureContext } from "./internal/context.js";

const requestContext = new AsyncLocalStorage<CaptureContext>();
installRequestContext(
  () => requestContext.getStore(),
  (context, task) => requestContext.run(context, task),
);

export { captureAutomatic, registerAutomatic };
export { runWithContext, type CaptureContext } from "./internal/context.js";
export { once } from "./internal/dedupe.js";
export {
  FatalAdapter,
  beforeFatal,
  installFatalCapture,
  installContinuousCapture,
  type FatalAdapterShape,
} from "./internal/fatal.js";
export { init as initRuntime, type RuntimeCapturePolicy } from "./internal/runtime.js";
