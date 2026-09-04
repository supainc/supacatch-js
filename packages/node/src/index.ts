import type { SdkConfig, SupaCatchClient } from "@supainc/supacatch";
import { init as initRuntime, layer as runtimeLayer } from "@supainc/supacatch/internal/runtime";
import { processFatalAdapter } from "./process-adapter.js";

export const init = (config: SdkConfig): SupaCatchClient =>
  initRuntime(config, processFatalAdapter);

export const layer = (config: SdkConfig) => runtimeLayer(config, processFatalAdapter);

export * from "@supainc/supacatch";
