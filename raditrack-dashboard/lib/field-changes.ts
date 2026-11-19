// Before/after comparison of record fields. Pure: safe in the browser and on the server.

type Scalar = string | number | boolean | null;

/** `{ field: [before, after] }`, with dates written as ISO strings. */
export type FieldChanges = Record<string, [Scalar, Scalar]>;

export function toScalar(value: unknown): Scalar {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

/**
 * The fields that differ between `before` and `after`, as `{ field: [before, after] }`.
 * Pass `before = null` for a new record (every field listed) and `after = null` for a removed one.
 */
export function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  fields: readonly string[],
): FieldChanges {
  const changes: FieldChanges = {};
  for (const field of fields) {
    const from = toScalar(before?.[field]);
    const to = toScalar(after?.[field]);
    if (from !== to) changes[field] = [from, to];
  }
  return changes;
}
