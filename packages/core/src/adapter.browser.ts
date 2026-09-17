import {
  captureAutomatic,
  installRequestContext,
  registerAutomatic,
} from "./internal/automatic.js";
import type { CaptureContext } from "./internal/context.js";

let currentContext: CaptureContext | undefined;
installRequestContext(
  () => currentContext,
  (context, task) => {
    const previous = currentContext;
    currentContext = context;
    try {
      return task();
    } finally {
      currentContext = previous;
    }
  },
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
export { init as initRuntime } from "./internal/runtime.browser.js";
export { init as initContinuousRuntime } from "./internal/runtime.browser.js";
