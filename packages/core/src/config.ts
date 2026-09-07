import { InvalidConfigurationError } from "./errors.js";

export interface SdkConfig {
  readonly endpoint?: string;
  readonly ingestKey: string;
  readonly requestTimeout?: number;
}

export interface RuntimeConfig {
  readonly endpoint: URL;
  readonly ingestKey: string;
  readonly requestTimeout: number;
}

export const resolveConfig = (input: SdkConfig): RuntimeConfig => {
  if (typeof input !== "object" || input === null) {
    throw new InvalidConfigurationError({
      issue: "configuration must be an object",
    });
  }

  const endpointInput =
    input.endpoint === undefined ? "https://ingest.catch.supa.dev" : input.endpoint;
  if (typeof endpointInput !== "string") {
    throw new InvalidConfigurationError({
      issue: "endpoint must be a valid URL",
    });
  }

  let endpoint: URL;

  try {
    endpoint = new URL(endpointInput);
  } catch {
    throw new InvalidConfigurationError({
      issue: "endpoint must be a valid URL",
    });
  }

  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw new InvalidConfigurationError({
      issue: "endpoint must use HTTP or HTTPS",
    });
  }

  if (typeof input.ingestKey !== "string" || input.ingestKey.length < 8) {
    throw new InvalidConfigurationError({
      issue: "ingestKey must contain at least 8 characters",
    });
  }

  const requestTimeout = input.requestTimeout === undefined ? 5_000 : input.requestTimeout;
  if (
    typeof requestTimeout !== "number" ||
    !Number.isFinite(requestTimeout) ||
    requestTimeout <= 0
  ) {
    throw new InvalidConfigurationError({
      issue: "requestTimeout must be a positive number of milliseconds",
    });
  }

  return {
    endpoint,
    ingestKey: input.ingestKey,
    requestTimeout,
  };
};
