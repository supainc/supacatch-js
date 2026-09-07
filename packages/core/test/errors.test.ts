import { assert, describe, it } from "@effect/vitest";
import {
  CaptureTimeoutError,
  InvalidConfigurationError,
  InvalidSuccessResponseError,
  RejectedResponseError,
  RequestEncodingError,
  TransportError,
  UnavailableResponseError,
  UnexpectedResponseError,
} from "../src/errors.js";

describe("native errors", () => {
  it("preserves literal tags and public fields", () => {
    const cause = new Error("cause");
    const invalidConfiguration = new InvalidConfigurationError({ issue: "invalid" });
    const requestEncoding = new RequestEncodingError({ cause });
    const transport = new TransportError({ cause });
    const timeout = new CaptureTimeoutError({ timeoutMillis: 25 });
    const rejected = new RejectedResponseError({ status: 401 });
    const unavailable = new UnavailableResponseError({ status: 503 });
    const unexpected = new UnexpectedResponseError({ status: 500 });
    const invalidSuccess = new InvalidSuccessResponseError({ cause });

    for (const error of [
      invalidConfiguration,
      requestEncoding,
      transport,
      timeout,
      rejected,
      unavailable,
      unexpected,
      invalidSuccess,
    ]) {
      assert.instanceOf(error, Error);
      assert.strictEqual(error.name, error._tag);
    }

    assert.strictEqual(invalidConfiguration._tag, "InvalidConfigurationError");
    assert.strictEqual(invalidConfiguration.issue, "invalid");
    assert.strictEqual(requestEncoding._tag, "RequestEncodingError");
    assert.strictEqual(requestEncoding.cause, cause);
    assert.strictEqual(transport._tag, "TransportError");
    assert.strictEqual(transport.cause, cause);
    assert.strictEqual(timeout._tag, "CaptureTimeoutError");
    assert.strictEqual(timeout.timeoutMillis, 25);
    assert.strictEqual(rejected._tag, "RejectedResponseError");
    assert.strictEqual(rejected.status, 401);
    assert.strictEqual(unavailable._tag, "UnavailableResponseError");
    assert.strictEqual(unavailable.status, 503);
    assert.strictEqual(unexpected._tag, "UnexpectedResponseError");
    assert.strictEqual(unexpected.status, 500);
    assert.strictEqual(invalidSuccess._tag, "InvalidSuccessResponseError");
    assert.strictEqual(invalidSuccess.cause, cause);
  });
});
