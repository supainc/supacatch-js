import { captureWith } from "./capture.js";
import type { SdkConfig } from "./config.js";
import { resolveConfig } from "./config.js";
import type { EventId } from "./event.js";

export interface SupaCatchClient {
  readonly captureException: (value: unknown) => Promise<EventId>;
  readonly dispose: () => void;
}

export const createClient = (config: SdkConfig): SupaCatchClient => {
  const resolved = resolveConfig(config);
  const active = new Set<AbortController>();

  return {
    captureException: async (value) => {
      const controller = new AbortController();
      active.add(controller);
      const timeout = setTimeout(
        () => controller.abort("SupaCatchTimeout"),
        resolved.requestTimeout,
      );
      try {
        return await captureWith(resolved, value, controller.signal);
      } finally {
        clearTimeout(timeout);
        active.delete(controller);
      }
    },
    dispose: () => {
      for (const controller of active) controller.abort("SupaCatchDisposed");
      active.clear();
    },
  };
};
