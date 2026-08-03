import type { SdkConfig } from "./config.js";
import { processFatalAdapter } from "./internal/process.js";
import { init as initRuntime, layer as runtimeLayer } from "./internal/runtime.js";
import type { SupaCatchClient } from "./client.js";

export const init = (config: SdkConfig): SupaCatchClient =>
  initRuntime(config, processFatalAdapter);

export const layer = (config: SdkConfig) => runtimeLayer(config, processFatalAdapter);

export type { SdkConfig } from "./config.js";
export type { SupaCatchClient } from "./client.js";
export * from "./errors.js";
export { EventId, EventRequest, SubmitEventResponse } from "./event.js";
