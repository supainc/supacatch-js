export class InvalidConfigurationError extends Error {
  readonly _tag = "InvalidConfigurationError";
  readonly issue: string;

  constructor({ issue }: { readonly issue: string }) {
    super(issue);
    this.name = this._tag;
    this.issue = issue;
  }
}

export class RequestEncodingError extends Error {
  readonly _tag = "RequestEncodingError";
  override readonly cause: unknown;

  constructor({ cause }: { readonly cause: unknown }) {
    super("Could not encode the Event request", { cause });
    this.name = this._tag;
    this.cause = cause;
  }
}

export class TransportError extends Error {
  readonly _tag = "TransportError";
  override readonly cause: unknown;

  constructor({ cause }: { readonly cause: unknown }) {
    super("Could not reach the SupaCatch ingest endpoint", { cause });
    this.name = this._tag;
    this.cause = cause;
  }
}

export class CaptureTimeoutError extends Error {
  readonly _tag = "CaptureTimeoutError";
  readonly timeoutMillis: number;

  constructor({ timeoutMillis }: { readonly timeoutMillis: number }) {
    super(`The SupaCatch request timed out after ${timeoutMillis} milliseconds`);
    this.name = this._tag;
    this.timeoutMillis = timeoutMillis;
  }
}

export class RejectedResponseError extends Error {
  readonly _tag = "RejectedResponseError";
  readonly status: number;

  constructor({ status }: { readonly status: number }) {
    super(`The SupaCatch ingest endpoint rejected the request with status ${status}`);
    this.name = this._tag;
    this.status = status;
  }
}

export class UnavailableResponseError extends Error {
  readonly _tag = "UnavailableResponseError";
  readonly status: number;

  constructor({ status }: { readonly status: number }) {
    super(`The SupaCatch ingest endpoint is unavailable with status ${status}`);
    this.name = this._tag;
    this.status = status;
  }
}

export class UnexpectedResponseError extends Error {
  readonly _tag = "UnexpectedResponseError";
  readonly status: number;

  constructor({ status }: { readonly status: number }) {
    super(`The SupaCatch ingest endpoint returned unexpected status ${status}`);
    this.name = this._tag;
    this.status = status;
  }
}

export class InvalidSuccessResponseError extends Error {
  readonly _tag = "InvalidSuccessResponseError";
  override readonly cause: unknown;

  constructor({ cause }: { readonly cause: unknown }) {
    super("The SupaCatch ingest endpoint returned an invalid accepted response", { cause });
    this.name = this._tag;
    this.cause = cause;
  }
}

export type CaptureError =
  | RequestEncodingError
  | TransportError
  | CaptureTimeoutError
  | RejectedResponseError
  | UnavailableResponseError
  | UnexpectedResponseError
  | InvalidSuccessResponseError;
