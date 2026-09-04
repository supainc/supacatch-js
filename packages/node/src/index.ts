import type { SdkConfig, SupaCatchClient } from "@supainc/supacatch-core";
import { initRuntime, runtimeLayer } from "@supainc/supacatch-core/adapter";
import { processFatalAdapter } from "./process-adapter.js";

export const init = (config: SdkConfig): SupaCatchClient =>
  initRuntime(config, processFatalAdapter);

export const layer = (config: SdkConfig) => runtimeLayer(config, processFatalAdapter);

export type { SdkConfig, SupaCatchClient } from "@supainc/supacatch-core";
export {
  CaptureTimeoutError,
  InvalidConfigurationError,
  InvalidSuccessResponseError,
  RejectedResponseError,
  RequestEncodingError,
  TransportError,
  UnavailableResponseError,
  UnexpectedResponseError,
  type CaptureError,
  EventId,
  EventRequest,
  SubmitEventResponse,
} from "@supainc/supacatch-core";
