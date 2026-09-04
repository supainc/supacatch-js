export { captureAutomatic, registerAutomatic } from "./internal/automatic.js";
export { runWithContext, type CaptureContext } from "./internal/context.js";
export { once } from "./internal/dedupe.js";
export {
  FatalAdapter,
  beforeFatal,
  installFatalCapture,
  type FatalAdapterShape,
} from "./internal/fatal.js";
export { init as initRuntime, layer as runtimeLayer } from "./internal/runtime.js";
