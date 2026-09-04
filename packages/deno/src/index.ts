import type { SdkConfig, SupaCatchClient } from "@supainc/supacatch";
import { init as initRuntime, layer as runtimeLayer } from "@supainc/supacatch/internal/runtime";
import { webFatalAdapter } from "./web-adapter.js";

export const init = (config: SdkConfig): SupaCatchClient => initRuntime(config, webFatalAdapter);

export const layer = (config: SdkConfig) => runtimeLayer(config, webFatalAdapter);

export * from "@supainc/supacatch";
