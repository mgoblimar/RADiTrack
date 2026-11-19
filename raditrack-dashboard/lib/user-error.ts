/**
 * An error whose message is written for the user and is safe to show on screen.
 *
 * Anything else (database, driver or library errors) can contain table names,
 * SQL or stack details, so actions show a plain fallback message instead.
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

/** The message to show for `error`: its own text for a UserError, otherwise `fallback`. */
export function userMessage(error: unknown, fallback: string): string {
  return error instanceof UserError ? error.message : fallback;
}
