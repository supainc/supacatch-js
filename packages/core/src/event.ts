declare const eventIdBrand: unique symbol;
declare const eventEnvironmentBrand: unique symbol;

export type EventId = string & { readonly [eventIdBrand]: "EventId" };
export type EventEnvironment = string & {
  readonly [eventEnvironmentBrand]: "EventEnvironment";
};

export interface EventRequest {
  readonly name: string;
  readonly message: string;
  readonly stackTrace?: string | null;
  readonly environment?: EventEnvironment;
  readonly timestamp: string;
}

export interface SubmitEventResponse {
  readonly eventId: EventId;
}

export const isEventId = (value: unknown): value is EventId =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const isEventEnvironment = (value: unknown): value is EventEnvironment =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 64 &&
  value !== "None" &&
  !/[\s/]/.test(value);

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
  } catch {
    // Fall through to String for values that JSON cannot serialize.
  }

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
    return {
      name: "NonError",
      message: stringify(value).slice(0, 10_000),
      timestamp: formattedTimestamp,
    };
  }

  const name = readString(error, "name");
  const stack = readString(error, "stack");

  return {
    name: (name === undefined || name.length === 0 ? "Error" : name).slice(0, 200),
    message: (readString(error, "message") ?? "").slice(0, 10_000),
    ...(stack === undefined ? {} : { stackTrace: stack.slice(0, 70_000) }),
    timestamp: formattedTimestamp,
  };
};
