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
import { EventId, normalizeException, SubmitEventResponse } from "./event.js";
import type { EventId as EventIdType } from "./event.js";

export const captureWith = async (
  config: RuntimeConfig,
  value: unknown,
  controller: AbortController,
): Promise<EventIdType> => {
  const payload = normalizeException(value, new Date());

  const eventUrl = new URL(config.endpoint);
  eventUrl.pathname = `${eventUrl.pathname.replace(/\/$/, "")}/v1/events`;
  eventUrl.search = "";
  eventUrl.hash = "";

  let body: string;
  try {
    const encoded = JSON.stringify(payload);
    if (encoded === undefined) {
      throw new TypeError("Event request did not encode to JSON");
    }
    body = encoded;
  } catch (cause) {
    throw new RequestEncodingError({ cause });
  }

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, config.requestTimeout);

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
      signal: controller.signal,
    });
  } catch (cause) {
    if (timedOut) {
      throw new CaptureTimeoutError({
        timeoutMillis: config.requestTimeout,
      });
    }
    throw new TransportError({ cause });
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    throw new RejectedResponseError({ status: response.status });
  }
  if (response.status === 503) {
    throw new UnavailableResponseError({ status: response.status });
  }
  if (response.status !== 202) {
    throw new UnexpectedResponseError({ status: response.status });
  }

  try {
    const decoded: unknown = await response.json();
    if (typeof decoded !== "object" || decoded === null) {
      throw new TypeError("accepted response must be an object");
    }
    const eventId: unknown = Reflect.get(decoded, "eventId");
    if (!EventId.is(eventId)) {
      throw new TypeError("accepted response eventId must be a UUIDv7 string");
    }
    return new SubmitEventResponse({ eventId }).eventId;
  } catch (cause) {
    throw new InvalidSuccessResponseError({ cause });
  }
};
