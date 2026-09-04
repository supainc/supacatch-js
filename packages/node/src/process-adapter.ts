import { FatalAdapter } from "@supainc/supacatch/internal/fatal";
import process from "node:process";

export const processFatalAdapter = FatalAdapter.of({
  install: (onFatal) => {
    const onException = (error: Error): void => {
      onFatal(error);
    };
    const onRejection = (reason: unknown): void => {
      onFatal(reason);
    };

    process.on("uncaughtException", onException);
    process.on("unhandledRejection", onRejection);

    return () => {
      process.off("uncaughtException", onException);
      process.off("unhandledRejection", onRejection);
    };
  },
  onFirstFatal: (value) => {
    try {
      console.error(value);
    } catch {
      // Fatal handling must continue even if console output fails.
    }
  },
  finishFatal: () => process.exit(1),
  finishDuplicateFatal: () => process.exit(1),
});
