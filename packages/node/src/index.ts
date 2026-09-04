import type { SdkConfig, SupaCatchClient } from "@supainc/supacatch";
import { initRuntime, runtimeLayer } from "@supainc/supacatch/adapter";
import { processFatalAdapter } from "./process-adapter.js";

export const init = (config: SdkConfig): SupaCatchClient =>
  initRuntime(config, processFatalAdapter);

export const layer = (config: SdkConfig) => runtimeLayer(config, processFatalAdapter);

export type { SdkConfig, SupaCatchClient } from "@supainc/supacatch";
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
} from "@supainc/supacatch";
