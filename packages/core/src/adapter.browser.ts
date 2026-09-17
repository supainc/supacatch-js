export { captureAutomatic, registerAutomatic } from "./internal/automatic.browser.js";
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
