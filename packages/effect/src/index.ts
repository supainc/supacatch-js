import { InvalidConfigurationError, type SdkConfig } from "@supainc/supacatch-core";
import { layer as coreLayer, SupaCatch } from "@supainc/supacatch-core/effect";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

export { SupaCatch };

export const layer = (config: SdkConfig): Layer.Layer<SupaCatch, InvalidConfigurationError> =>
  coreLayer(config).pipe(Layer.provide(FetchHttpClient.layer));

export type {
  CaptureError,
  EventEnvironment,
  EventId,
  EventRequest,
  SdkConfig,
  SubmitEventResponse,
  SupaCatchClient,
} from "@supainc/supacatch-core";
export {
  CaptureTimeoutError,
  InvalidConfigurationError,
  InvalidSuccessResponseError,
  RejectedResponseError,
  RequestEncodingError,
  TransportError,
  UnavailableResponseError,
  UnexpectedResponseError,
} from "@supainc/supacatch-core";
