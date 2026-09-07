import { captureWith } from "./capture.js";
import type { SdkConfig } from "./config.js";
import { resolveConfig } from "./config.js";
import { TransportError } from "./errors.js";
import type { EventId } from "./event.js";

export interface SupaCatchClient {
  readonly captureException: (value: unknown) => Promise<EventId>;
  readonly dispose: () => void;
}

export const createClient = (config: SdkConfig): SupaCatchClient => {
  const resolved = resolveConfig(config);
  let state:
    | {
        readonly _tag: "Active";
        readonly captures: Set<AbortController>;
      }
    | {
        readonly _tag: "Disposed";
      } = {
    _tag: "Active",
    captures: new Set(),
  };

  return {
    captureException: (value) => {
      switch (state._tag) {
        case "Active": {
          const active = state;
          const controller = new AbortController();
          active.captures.add(controller);
          return captureWith(resolved, value, controller).finally(() => {
            active.captures.delete(controller);
          });
        }
        case "Disposed":
          return Promise.reject(
            new TransportError({
              cause: new Error("SupaCatch client is disposed"),
            }),
          );
        default: {
          const unexpectedState: never = state;
          return unexpectedState;
        }
      }
    },
    dispose: () => {
      switch (state._tag) {
        case "Active":
          for (const controller of state.captures) controller.abort();
          state.captures.clear();
          state = { _tag: "Disposed" };
          return;
        case "Disposed":
          return;
        default: {
          const unexpectedState: never = state;
          return unexpectedState;
        }
      }
    },
  };
};
