import * as BunSdk from "@supainc/supacatch-bun";
import * as CloudflareSdk from "@supainc/supacatch-cloudflare";
import * as NodeSdk from "@supainc/supacatch-node";
import { assert, describe, it } from "@effect/vitest";

const sharedExports = [
  "CaptureTimeoutError",
  "EventId",
  "EventRequest",
  "InvalidConfigurationError",
  "InvalidSuccessResponseError",
  "RejectedResponseError",
  "RequestEncodingError",
  "SubmitEventResponse",
  "TransportError",
  "UnavailableResponseError",
  "UnexpectedResponseError",
];

describe("runtime package exports", () => {
  it("keeps Node and Bun on the runtime API", () => {
    const runtimeExports = [...sharedExports, "init", "layer"].sort();
    assert.deepStrictEqual(Object.keys(NodeSdk).sort(), runtimeExports);
    assert.deepStrictEqual(Object.keys(BunSdk).sort(), runtimeExports);
  });

  it("keeps Cloudflare on the worker API", () => {
    assert.deepStrictEqual(
      Object.keys(CloudflareSdk).sort(),
      [...sharedExports, "withCatch"].sort(),
    );
  });
});
