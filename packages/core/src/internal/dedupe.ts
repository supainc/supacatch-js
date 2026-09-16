import { appendFileSync } from "node:fs";

const inFlight = new WeakMap<object, WeakSet<object>>();

export const once = async (
  value: unknown,
  owner: object,
  capture: () => Promise<unknown>,
): Promise<void> => {
  // #region agent log
  const __dbgValue =
    value instanceof Error
      ? { name: value.name, message: value.message }
      : { typeofValue: typeof value };
  appendFileSync(
    "/opt/cursor/logs/debug.log",
    JSON.stringify({
      location: "dedupe.ts:once:entry",
      message: "once entered with lazy capture factory",
      data: { ...__dbgValue, ownerType: owner.constructor?.name ?? typeof owner },
      timestamp: Date.now(),
      hypothesisId: "A",
      runId: "post-fix",
    }) + "\n",
  );
  // #endregion
  if ((typeof value !== "object" || value === null) && typeof value !== "function") {
    // #region agent log
    appendFileSync(
      "/opt/cursor/logs/debug.log",
      JSON.stringify({
        location: "dedupe.ts:once:primitive",
        message: "primitive path; invoking capture factory",
        data: __dbgValue,
        timestamp: Date.now(),
        hypothesisId: "D",
        runId: "post-fix",
      }) + "\n",
    );
    // #endregion
    await capture();
    return;
  }

  const owners = inFlight.get(value) ?? new WeakSet<object>();
  if (owners.has(owner)) {
    // #region agent log
    appendFileSync(
      "/opt/cursor/logs/debug.log",
      JSON.stringify({
        location: "dedupe.ts:once:early-return",
        message: "dedupe hit; skipping capture factory (no Promise started)",
        data: __dbgValue,
        timestamp: Date.now(),
        hypothesisId: "A",
        runId: "post-fix",
      }) + "\n",
    );
    // #endregion
    return;
  }
  inFlight.set(value, owners);
  owners.add(owner);
  // #region agent log
  appendFileSync(
    "/opt/cursor/logs/debug.log",
    JSON.stringify({
      location: "dedupe.ts:once:proceed",
      message: "first capture for owner; invoking capture factory",
      data: __dbgValue,
      timestamp: Date.now(),
      hypothesisId: "B",
      runId: "post-fix",
    }) + "\n",
  );
  // #endregion
  try {
    await capture();
  } finally {
    setTimeout(() => {
      owners.delete(owner);
      // #region agent log
      appendFileSync(
        "/opt/cursor/logs/debug.log",
        JSON.stringify({
          location: "dedupe.ts:once:owner-cleared",
          message: "owner removed from inFlight after setTimeout(0)",
          data: __dbgValue,
          timestamp: Date.now(),
          hypothesisId: "C",
          runId: "post-fix",
        }) + "\n",
      );
      // #endregion
    }, 0);
  }
};
