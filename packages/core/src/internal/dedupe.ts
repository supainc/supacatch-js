import { Duration, Effect, Option, Predicate } from "effect";

const inFlight = new WeakMap<object, WeakSet<object>>();

export const once = <Result, Failure, Requirements>(
  value: unknown,
  owner: object,
  capture: Effect.Effect<Result, Failure, Requirements>,
): Effect.Effect<void, Failure, Requirements> =>
  Effect.suspend(() => {
    const key = Predicate.isObjectKeyword(value) ? Option.some(value) : Option.none();
    return Option.match(key, {
      onNone: () => capture.pipe(Effect.asVoid),
      onSome: (object) => {
        const owners = inFlight.get(object) ?? new WeakSet<object>();
        if (owners.has(owner)) return Effect.succeed(undefined);
        inFlight.set(object, owners);
        owners.add(owner);
        return capture.pipe(
          Effect.asVoid,
          Effect.ensuring(
            Effect.sleep(Duration.millis(0)).pipe(
              Effect.andThen(Effect.sync(() => owners.delete(owner))),
              Effect.forkDetach,
              Effect.asVoid,
            ),
          ),
        );
      },
    });
  });
