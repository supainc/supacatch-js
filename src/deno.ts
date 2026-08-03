import type { SdkConfig } from "./config.js";
import { init as initRuntime, layer as runtimeLayer } from "./internal/runtime.js";
import { webFatalAdapter } from "./internal/web.js";
import type { SupaCatchClient } from "./client.js";

export const init = (config: SdkConfig): SupaCatchClient => initRuntime(config, webFatalAdapter);

export const layer = (config: SdkConfig) => runtimeLayer(config, webFatalAdapter);

export type { SdkConfig } from "./config.js";
export type { SupaCatchClient } from "./client.js";
export * from "./errors.js";
export { EventId, EventRequest, SubmitEventResponse } from "./event.js";
