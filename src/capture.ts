import { Cause, DateTime, Duration, Effect, Match } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";
import type { ResolvedConfig } from "./config.js";
import {
  CaptureTimeoutError,
  InvalidSuccessResponseError,
  RejectedResponseError,
  RequestEncodingError,
  TransportError,
  UnavailableResponseError,
  UnexpectedResponseError,
} from "./errors.js";
import { EventRequest, normalizeException, SubmitEventResponse } from "./event.js";

export const captureWith = Effect.fn("SupaCatch.captureException")(function* (
  httpClient: HttpClient.HttpClient,
  config: ResolvedConfig,
  value: unknown,
) {
  const now = yield* DateTime.now;
  const payload = normalizeException(value, now);

  const request = yield* HttpClientRequest.post(config.eventUrl).pipe(
    HttpClientRequest.bearerToken(config.ingestKey),
    HttpClientRequest.acceptJson,
    HttpClientRequest.schemaBodyJson(EventRequest)(payload),
    Effect.mapError((cause) => new RequestEncodingError({ cause })),
  );

  const response = yield* httpClient.execute(request).pipe(
    Effect.timeout(config.requestTimeout),
    Effect.mapError((cause) =>
      Cause.isTimeoutError(cause)
        ? new CaptureTimeoutError({ timeoutMillis: Duration.toMillis(config.requestTimeout) })
        : new TransportError({ cause }),
    ),
  );

  yield* Match.value(response.status).pipe(
    Match.when(202, () => Effect.void),
    Match.whenOr(401, 403, (status) => Effect.fail(new RejectedResponseError({ status }))),
    Match.when(503, (status) => Effect.fail(new UnavailableResponseError({ status }))),
    Match.orElse((status) => Effect.fail(new UnexpectedResponseError({ status }))),
  );

  const accepted = yield* HttpClientResponse.schemaBodyJson(SubmitEventResponse)(response).pipe(
    Effect.mapError((cause) => new InvalidSuccessResponseError({ cause })),
  );
  return accepted.eventId;
});
