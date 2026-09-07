import { assert, describe, it } from "@effect/vitest";
import { resolveConfig } from "../src/config.js";
import { InvalidConfigurationError } from "../src/errors.js";

describe("configuration", () => {
  it("uses the SupaCatch ingest endpoint by default", () => {
    const config = resolveConfig({ ingestKey: "sck_12345678" });

    assert.strictEqual(config.endpoint.toString(), "https://ingest.catch.supa.dev/");
  });

  it("retains the configured ingest base URL", () => {
    const config = resolveConfig({
      endpoint: "https://ingest.example.test/base/?private=value",
      ingestKey: "sck_12345678",
    });

    assert.strictEqual(
      config.endpoint.toString(),
      "https://ingest.example.test/base/?private=value",
    );
    assert.strictEqual(config.requestTimeout, 5_000);
    assert.strictEqual(config.ingestKey, "sck_12345678");
  });

  it("rejects invalid configuration without exposing the key", () => {
    const secret = "secret-value";

    try {
      resolveConfig({ endpoint: "not a url", ingestKey: secret });
      assert.fail("expected configuration validation to fail");
    } catch (error) {
      assert.instanceOf(error, InvalidConfigurationError);
      assert.strictEqual(error._tag, "InvalidConfigurationError");
      assert.strictEqual(error.issue, "endpoint must be a valid URL");
      assert.notInclude(String(error), secret);
      assert.notInclude(JSON.stringify(error), secret);
    }
  });

  it("accepts only HTTP endpoints, sufficiently long keys, and positive finite timeouts", () => {
    for (const config of [
      { endpoint: "file:///tmp/events", ingestKey: "sck_test_key" },
      { ingestKey: "short" },
      { ingestKey: "sck_test_key", requestTimeout: 0 },
      { ingestKey: "sck_test_key", requestTimeout: Number.POSITIVE_INFINITY },
    ]) {
      assert.throws(() => resolveConfig(config), InvalidConfigurationError);
    }
  });
});
