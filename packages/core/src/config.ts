import { InvalidConfigurationError } from "./errors.js";
import { isEventEnvironment, type EventEnvironment } from "./event.js";

export interface SdkConfig {
  readonly endpoint?: string;
  readonly ingestKey: string;
  readonly environment?: EventEnvironment | string;
  readonly requestTimeout?: number;
}

export interface RuntimeConfig {
  readonly endpoint: URL;
  readonly ingestKey: string;
  readonly environment?: EventEnvironment;
  readonly requestTimeout: number;
}

export const resolveConfig = (input: SdkConfig): RuntimeConfig => {
  let endpoint: URL;
  try {
    endpoint = new URL(input.endpoint ?? "https://ingest.catch.supa.dev");
  } catch {
    throw new InvalidConfigurationError({ issue: "endpoint must be a valid URL" });
  }

  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw new InvalidConfigurationError({ issue: "endpoint must use HTTP or HTTPS" });
  }
  if (typeof input.ingestKey !== "string" || input.ingestKey.length < 8) {
    throw new InvalidConfigurationError({ issue: "ingestKey must contain at least 8 characters" });
  }
  if (input.environment !== undefined && !isEventEnvironment(input.environment)) {
    throw new InvalidConfigurationError({ issue: "environment is invalid" });
  }

  const requestTimeout = input.requestTimeout ?? 5_000;
  if (!Number.isFinite(requestTimeout) || requestTimeout <= 0) {
    throw new InvalidConfigurationError({
      issue: "requestTimeout must be a positive number of milliseconds",
    });
  }

  return {
    endpoint,
    ingestKey: input.ingestKey,
    ...(input.environment === undefined ? {} : { environment: input.environment }),
    requestTimeout,
  };
};
