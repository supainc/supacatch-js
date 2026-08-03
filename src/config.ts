import { Duration, Effect, Match, Predicate, Redacted, String as Str } from "effect";
import { InvalidConfigurationError } from "./errors.js";

export interface SdkConfig {
  readonly endpoint: string;
  readonly ingestKey: string;
  readonly requestTimeout?: number;
}

export interface ResolvedConfig {
  readonly eventUrl: URL;
  readonly ingestKey: Redacted.Redacted<string>;
  readonly requestTimeout: Duration.Duration;
}

const defaultRequestTimeout = Duration.seconds(5);

// Issue messages stay static so an invalid Ingest Key is never echoed back.
const invalidConfiguration = (issue: string): InvalidConfigurationError =>
  new InvalidConfigurationError({ issue });

const ensure = (
  condition: boolean,
  issue: string,
): Effect.Effect<void, InvalidConfigurationError> =>
  condition ? Effect.void : Effect.fail(invalidConfiguration(issue));

const isPositiveMillis = (value: number): boolean => Number.isFinite(value) && value > 0;

export const resolveConfig = Effect.fn("SupaCatch.resolveConfig")(function* (input: SdkConfig) {
  yield* ensure(Predicate.isObjectKeyword(input), "configuration must be an object");
  yield* ensure(
    Predicate.isString(input.endpoint) && Str.isNonEmpty(input.endpoint),
    "endpoint must be a non-empty URL",
  );
  yield* ensure(
    Predicate.isString(input.ingestKey) && input.ingestKey.length >= 8,
    "Ingest Key must contain at least 8 characters",
  );

  const requestTimeout = yield* Match.value(input.requestTimeout).pipe(
    Match.when(Predicate.isUndefined, () => Effect.succeed(defaultRequestTimeout)),
    Match.when(
      (candidate): candidate is number =>
        Predicate.isNumber(candidate) && isPositiveMillis(candidate),
      (millis) => Effect.succeed(Duration.millis(millis)),
    ),
    Match.orElse(() =>
      Effect.fail(invalidConfiguration("requestTimeout must be a positive number of milliseconds")),
    ),
  );

  const eventUrl = yield* Effect.try({
    try: () => new URL(input.endpoint),
    catch: () => invalidConfiguration("endpoint must be a valid URL"),
  });
  yield* Match.value(eventUrl.protocol).pipe(
    Match.whenOr("http:", "https:", () => Effect.void),
    Match.orElse(() => Effect.fail(invalidConfiguration("endpoint must use HTTP or HTTPS"))),
  );

  eventUrl.pathname = `${Str.replace(/\/$/, "")(eventUrl.pathname)}/v1/events`;
  eventUrl.search = "";
  eventUrl.hash = "";

  return {
    eventUrl,
    ingestKey: Redacted.make(input.ingestKey),
    requestTimeout,
  } satisfies ResolvedConfig;
});
