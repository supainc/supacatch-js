import type { SdkConfig, SupaCatchClient } from "@supainc/supacatch-core";
import { initRuntime } from "@supainc/supacatch-core/adapter";
import { browserFatalAdapter } from "./window-adapter.js";

export type BrowserSdkConfig = Omit<SdkConfig, "ingestKey"> & {
  readonly publicKey: string;
};

export const init = ({ publicKey, ...config }: BrowserSdkConfig): SupaCatchClient =>
  initRuntime({ ...config, ingestKey: publicKey }, browserFatalAdapter);

export type { SupaCatchClient } from "@supainc/supacatch-core";
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
  type EventEnvironment,
  type EventId,
  type EventRequest,
  type SubmitEventResponse,
} from "@supainc/supacatch-core";
