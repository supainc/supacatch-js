const inFlight = new WeakMap<object, WeakSet<object>>();

export const once = async (
  value: unknown,
  owner: object,
  capture: () => Promise<unknown>,
): Promise<void> => {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") {
    await capture();
    return;
  }

  const owners = inFlight.get(value) ?? new WeakSet<object>();
  if (owners.has(owner)) return;
  inFlight.set(value, owners);
  owners.add(owner);
  try {
    await capture();
  } finally {
    setTimeout(() => owners.delete(owner), 0);
  }
};
