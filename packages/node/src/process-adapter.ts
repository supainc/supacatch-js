import { FatalAdapter } from "@supainc/supacatch/adapter";
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
  onFirstFatal: (value) => console.error(value),
  finishFatal: () => process.exit(1),
  finishDuplicateFatal: () => process.exit(1),
});
