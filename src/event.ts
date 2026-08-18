import { DateTime, Option, Predicate, Schema } from "effect";

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

const readString = (value: object, property: string): string | undefined =>
  Option.liftThrowable(() => Reflect.get(value, property))().pipe(
    Option.filter(Predicate.isString),
    Option.getOrUndefined,
  );

const stringify = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "bigint" || typeof value === "symbol") {
    return globalThis.String(value);
  }

  const seen = new WeakSet<object>();
  return Option.liftThrowable(() =>
    JSON.stringify(value, (_key: string, entry: unknown) => {
      if (typeof entry === "bigint" || typeof entry === "symbol") {
        return globalThis.String(entry);
      }

      if ((typeof entry === "object" && entry !== null) || typeof entry === "function") {
        if (seen.has(entry)) return "[Circular]";
        seen.add(entry);
      }

      return entry;
    }),
  )().pipe(
    Option.filter(Predicate.isString),
    Option.orElse(() => Option.liftThrowable(() => globalThis.String(value))()),
    Option.getOrElse(() => "[Unserializable value]"),
  );
};

export const normalizeException = (value: unknown, timestamp: DateTime.Utc): EventRequest => {
  const formattedTimestamp = DateTime.formatIso(timestamp);
  const error = Option.liftThrowable(() => (Predicate.isError(value) ? value : undefined))().pipe(
    Option.getOrUndefined,
  );

  if (error === undefined) {
    return new EventRequest({
      name: "NonError",
      message: stringify(value).slice(0, 10_000),
      timestamp: formattedTimestamp,
    });
  }

  const name = readString(error, "name");
  const stack = readString(error, "stack");

  return new EventRequest({
    name: (name === undefined || name.length === 0 ? "Error" : name).slice(0, 200),
    message: (readString(error, "message") ?? "").slice(0, 10_000),
    ...(stack === undefined ? {} : { stackTrace: stack.slice(0, 70_000) }),
    timestamp: formattedTimestamp,
  });
};
