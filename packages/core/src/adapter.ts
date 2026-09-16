export { captureAutomatic, registerAutomatic } from "./internal/automatic.js";
export { runWithContext, type CaptureContext } from "./internal/context.js";
export { once } from "./internal/dedupe.js";
export { beforeFatal, installFatalCapture, type FatalAdapterShape } from "./internal/fatal.js";
export { init as initRuntime } from "./internal/runtime.js";
