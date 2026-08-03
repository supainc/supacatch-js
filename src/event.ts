import { DateTime, identity, Match, Option, Predicate, pipe, Schema, String as Str } from "effect";

export const EventId = Schema.String.pipe(Schema.check(Schema.isUUID(7)), Schema.brand("EventId"));
export type EventId = typeof EventId.Type;

const EventTimestamp = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)),
);

export class EventRequest extends Schema.Class<EventRequest>("EventRequest")({
  name: Schema.NonEmptyString.pipe(Schema.check(Schema.isMaxLength(200))),
  message: Schema.String.pipe(Schema.check(Schema.isMaxLength(10_000))),
  stackTrace: Schema.optional(
    Schema.NullOr(Schema.String.pipe(Schema.check(Schema.isMaxLength(70_000)))),
  ),
  timestamp: EventTimestamp,
}) {}

export class SubmitEventResponse extends Schema.Class<SubmitEventResponse>("SubmitEventResponse")({
  eventId: EventId,
}) {}

const truncate = (maximumLength: number): ((value: string) => string) =>
  Str.slice(0, maximumLength);

// Every read of a captured value may hit a hostile Proxy trap, so evaluation
// is lifted into Option instead of being allowed to throw.
const tryOption = <A>(evaluate: () => A): Option.Option<A> => Option.liftThrowable(evaluate)();

const readString = (value: object, property: string): Option.Option<string> =>
  tryOption(() => Reflect.get(value, property)).pipe(Option.filter(Predicate.isString));

const isErrorValue = (value: unknown): value is object =>
  tryOption(() => Predicate.isError(value)).pipe(Option.getOrElse(() => false));

const encodeJson = (value: unknown): Option.Option<string> =>
  tryOption(() => {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key: string, entry: unknown) =>
      Match.value(entry).pipe(
        Match.whenOr(Match.bigint, Match.symbol, (primitive) => globalThis.String(primitive)),
        Match.when(Predicate.isObjectKeyword, (candidate) => {
          if (seen.has(candidate)) return "[Circular]";
          seen.add(candidate);
          return candidate;
        }),
        Match.orElse(identity),
      ),
    );
  }).pipe(Option.filter(Predicate.isString));

const stringify = (value: unknown): string =>
  Match.value(value).pipe(
    Match.withReturnType<string>(),
    Match.when(Match.string, (text) => text),
    Match.whenOr(Match.symbol, Match.bigint, (primitive) => globalThis.String(primitive)),
    Match.orElse((other) =>
      encodeJson(other).pipe(
        Option.orElse(() => tryOption(() => globalThis.String(other))),
        Option.getOrElse(() => "[Unserializable value]"),
      ),
    ),
  );

const errorEvent = (error: object, timestamp: DateTime.Utc): EventRequest =>
  new EventRequest({
    name: pipe(
      readString(error, "name"),
      Option.filter(Str.isNonEmpty),
      Option.getOrElse(() => "Error"),
      truncate(200),
    ),
    message: pipe(
      readString(error, "message"),
      Option.getOrElse(() => ""),
      truncate(10_000),
    ),
    ...Option.match(readString(error, "stack"), {
      onNone: () => ({}),
      onSome: (stack) => ({ stackTrace: truncate(70_000)(stack) }),
    }),
    timestamp: DateTime.formatIso(timestamp),
  });

const nonErrorEvent = (value: unknown, timestamp: DateTime.Utc): EventRequest =>
  new EventRequest({
    name: "NonError",
    message: truncate(10_000)(stringify(value)),
    timestamp: DateTime.formatIso(timestamp),
  });

export const normalizeException = (value: unknown, timestamp: DateTime.Utc): EventRequest =>
  isErrorValue(value) ? errorEvent(value, timestamp) : nonErrorEvent(value, timestamp);
