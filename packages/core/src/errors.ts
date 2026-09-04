import { Schema } from "effect";

export class InvalidConfigurationError extends Schema.TaggedErrorClass<InvalidConfigurationError>()(
  "InvalidConfigurationError",
  { issue: Schema.String },
) {}

export class RequestEncodingError extends Schema.TaggedErrorClass<RequestEncodingError>()(
  "RequestEncodingError",
  { cause: Schema.Defect() },
) {}

export class TransportError extends Schema.TaggedErrorClass<TransportError>()("TransportError", {
  cause: Schema.Defect(),
}) {}

export class CaptureTimeoutError extends Schema.TaggedErrorClass<CaptureTimeoutError>()(
  "CaptureTimeoutError",
  { timeoutMillis: Schema.Number },
) {}

export class RejectedResponseError extends Schema.TaggedErrorClass<RejectedResponseError>()(
  "RejectedResponseError",
  { status: Schema.Number },
) {}

export class UnavailableResponseError extends Schema.TaggedErrorClass<UnavailableResponseError>()(
  "UnavailableResponseError",
  { status: Schema.Number },
) {}

export class UnexpectedResponseError extends Schema.TaggedErrorClass<UnexpectedResponseError>()(
  "UnexpectedResponseError",
  { status: Schema.Number },
) {}

export class InvalidSuccessResponseError extends Schema.TaggedErrorClass<InvalidSuccessResponseError>()(
  "InvalidSuccessResponseError",
  { cause: Schema.Defect() },
) {}

export type CaptureError =
  | RequestEncodingError
  | TransportError
  | CaptureTimeoutError
  | RejectedResponseError
  | UnavailableResponseError
  | UnexpectedResponseError
  | InvalidSuccessResponseError;
