import { Effect, MutableRef, Option } from "effect";

export type Capture = (value: unknown) => Effect.Effect<unknown, unknown>;

export interface CaptureContext {
  readonly capture: Capture;
}

interface ContextRunner {
  <Result>(context: CaptureContext, task: () => Result): Result;
}

const runner = MutableRef.make(Option.none<ContextRunner>());

export const installContext = (run: ContextRunner): void => {
  MutableRef.set(runner, Option.some(run));
};

export const runWithContext = <Result>(context: CaptureContext, task: () => Result): Result =>
  Option.match(MutableRef.get(runner), {
    onNone: task,
    onSome: (run) => run(context, task),
  });
