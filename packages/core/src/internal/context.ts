export type Capture = (value: unknown) => Promise<unknown>;

export interface CaptureContext {
  readonly capture: Capture;
}

interface ContextRunner {
  <Result>(context: CaptureContext, task: () => Result): Result;
}

let runner: ContextRunner | undefined;

export const installContext = (run: ContextRunner): void => {
  runner = run;
};

export const runWithContext = <Result>(context: CaptureContext, task: () => Result): Result =>
  runner === undefined ? task() : runner(context, task);
