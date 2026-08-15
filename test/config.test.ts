import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Redacted } from "effect";
import { resolveConfig } from "../src/config.js";
import { InvalidConfigurationError } from "../src/errors.js";

describe("configuration", () => {
  it("uses the SupaCatch ingest endpoint by default", () => {
    const config = Effect.runSync(resolveConfig({ ingestKey: "sck_12345678" }));

    assert.strictEqual(config.eventUrl.toString(), "https://ingest.catch.supa.dev/v1/events");
  });

  it("builds an overridden ingest Event URL without retaining query data", () => {
    const config = Effect.runSync(
      resolveConfig({
        endpoint: "https://ingest.example.test/base/?private=value",
        ingestKey: "sck_12345678",
      }),
    );

    assert.strictEqual(config.eventUrl.toString(), "https://ingest.example.test/base/v1/events");
    assert.strictEqual(Duration.toMillis(config.requestTimeout), 5_000);
    assert.strictEqual(Redacted.value(config.ingestKey), "sck_12345678");
  });

  it("rejects invalid configuration without exposing the key", () => {
    const secret = "secret-value";

    try {
      Effect.runSync(resolveConfig({ endpoint: "not a url", ingestKey: secret }));
      assert.fail("expected configuration validation to fail");
    } catch (error) {
      assert.instanceOf(error, InvalidConfigurationError);
      assert.notInclude(String(error), secret);
    }
  });
});
