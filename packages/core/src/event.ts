const eventIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare const eventIdBrand: unique symbol;

export type EventId = string & {
  readonly [eventIdBrand]: "EventId";
};

export const EventId = {
  is: (value: unknown): value is EventId => typeof value === "string" && eventIdPattern.test(value),
  make: (value: string): EventId => {
    if (!EventId.is(value)) {
      throw new TypeError("eventId must be a UUIDv7 string");
    }
    return value;
  },
};

export class EventRequest {
  readonly name: string;
  readonly message: string;
  readonly stackTrace?: string | null;
  readonly timestamp: string;

  constructor(input: {
    readonly name: string;
    readonly message: string;
    readonly stackTrace?: string | null;
    readonly timestamp: string;
  }) {
    this.name = input.name;
    this.message = input.message;
    if ("stackTrace" in input) this.stackTrace = input.stackTrace;
    this.timestamp = input.timestamp;
  }
}

export class SubmitEventResponse {
  readonly eventId: EventId;

  constructor({ eventId }: { readonly eventId: EventId }) {
    this.eventId = eventId;
  }
}

const readString = (value: object, property: string): string | undefined => {
  try {
    const result = Reflect.get(value, property);
    return typeof result === "string" ? result : undefined;
  } catch {
    return undefined;
  }
};

const stringify = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "bigint" || typeof value === "symbol") {
    return globalThis.String(value);
  }

  const seen = new WeakSet<object>();
  try {
    const result = JSON.stringify(value, (_key: string, entry: unknown) => {
      if (typeof entry === "bigint" || typeof entry === "symbol") {
        return globalThis.String(entry);
      }

      if ((typeof entry === "object" && entry !== null) || typeof entry === "function") {
        if (seen.has(entry)) return "[Circular]";
        seen.add(entry);
      }

      return entry;
    });
    if (typeof result === "string") return result;
  } catch {}

  try {
    return globalThis.String(value);
  } catch {
    return "[Unserializable value]";
  }
};

export const normalizeException = (value: unknown, timestamp: Date): EventRequest => {
  const formattedTimestamp = timestamp.toISOString();
  let error: Error | undefined;

  try {
    error = value instanceof Error ? value : undefined;
  } catch {
    error = undefined;
  }

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
