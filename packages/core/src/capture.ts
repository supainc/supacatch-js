import type { RuntimeConfig } from "./config.js";
import {
  CaptureTimeoutError,
  InvalidSuccessResponseError,
  RejectedResponseError,
  RequestEncodingError,
  TransportError,
  UnavailableResponseError,
  UnexpectedResponseError,
} from "./errors.js";
import { isEventId, normalizeException, type EventId } from "./event.js";

export const captureWith = async (
  config: RuntimeConfig,
  value: unknown,
  signal: AbortSignal,
): Promise<EventId> => {
  const event = normalizeException(value, new Date());
  const payload =
    config.environment === undefined ? event : { ...event, environment: config.environment };

  const eventUrl = new URL(config.endpoint);
  eventUrl.pathname = `${eventUrl.pathname.replace(/\/$/, "")}/v1/events`;
  eventUrl.search = "";
  eventUrl.hash = "";

  let body: string;
  try {
    body = JSON.stringify(payload);
  } catch (cause) {
    throw new RequestEncodingError({ cause });
  }

  let response: Response;
  try {
    response = await fetch(eventUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${config.ingestKey}`,
        "content-type": "application/json",
      },
      body,
      signal,
    });
  } catch (cause) {
    if (signal.aborted && signal.reason === "SupaCatchTimeout") {
      throw new CaptureTimeoutError({ timeoutMillis: config.requestTimeout });
    }
    throw new TransportError({ cause });
  }

  switch (response.status) {
    case 202:
      break;
    case 401:
    case 403:
      throw new RejectedResponseError({ status: response.status });
    case 503:
      throw new UnavailableResponseError({ status: response.status });
    default:
      throw new UnexpectedResponseError({ status: response.status });
  }

  let accepted: unknown;
  try {
    accepted = await response.json();
  } catch (cause) {
    throw new InvalidSuccessResponseError({ cause });
  }
  if (
    typeof accepted !== "object" ||
    accepted === null ||
    !isEventId(Reflect.get(accepted, "eventId"))
  ) {
    throw new InvalidSuccessResponseError({ cause: accepted });
  }
  return accepted.eventId;
};
