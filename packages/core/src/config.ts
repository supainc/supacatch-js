import { Duration, Effect, Schema } from "effect";
import { InvalidConfigurationError } from "./errors.js";

const Config = Schema.Struct({
  endpoint: Schema.URLFromString.pipe(
    Schema.check(
      Schema.makeFilter((endpoint) =>
        endpoint.protocol === "http:" || endpoint.protocol === "https:"
          ? true
          : "endpoint must use HTTP or HTTPS",
      ),
    ),
    Schema.withDecodingDefault(Effect.succeed("https://ingest.catch.supa.dev")),
  ),
  ingestKey: Schema.RedactedFromValue(Schema.String.pipe(Schema.check(Schema.isMinLength(8)))),
  requestTimeout: Schema.DurationFromMillis.pipe(
    Schema.check(
      Schema.makeFilter((requestTimeout) =>
        Duration.isFinite(requestTimeout) && Duration.isPositive(requestTimeout)
          ? true
          : "requestTimeout must be a positive number of milliseconds",
      ),
    ),
    Schema.withDecodingDefault(Effect.succeed(5_000)),
  ),
});

export type SdkConfig = typeof Config.Encoded;
export type RuntimeConfig = typeof Config.Type;

export const resolveConfig = Effect.fn("SupaCatch.resolveConfig")((input: SdkConfig) =>
  Schema.decodeEffect(Config)(input).pipe(
    Effect.mapError(
      (error) =>
        new InvalidConfigurationError({
          issue: error.message,
        }),
    ),
  ),
);
