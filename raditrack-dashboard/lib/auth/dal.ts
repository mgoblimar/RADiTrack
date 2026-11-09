import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SESSION_COOKIE, decryptSession } from "./session";
import { isUserRole, type CurrentUser } from "./roles";

/** Thrown by server actions when the caller is not allowed to do something. */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * The signed-in user, checked against the database on every request so that
 * deactivated accounts and reset passwords take effect immediately.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const session = await decryptSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const account = await prisma.userAccount.findUnique({
    where: { userId: session.userId },
    select: {
      userId: true,
      username: true,
      fullName: true,
      role: true,
      assignedModalities: true,
      mustChangePassword: true,
      isActive: true,
      sessionVersion: true,
    },
  });

  if (
    !account ||
    !account.isActive ||
    account.sessionVersion !== session.sessionVersion ||
    !isUserRole(account.role)
  ) {
    return null;
  }

  return {
    userId: account.userId,
    username: account.username,
    fullName: account.fullName,
    role: account.role,
    assignedModalities: account.assignedModalities,
    mustChangePassword: account.mustChangePassword,
  };
});

// ---------------------------------------------------------------------------
// Server actions: throw, so the action does nothing.
// ---------------------------------------------------------------------------

/**
 * Local maintenance scripts (e.g. `npm run test-data:verify`) import some actions
 * and call them directly in their own Node process, with no web request. Two
 * conditions must both hold, so a call that reaches an action over HTTP never
 * takes this path:
 *  - Next.js replaces NEXT_RUNTIME with "nodejs" in all server code it builds;
 *  - the script opted in by importing scripts/local-script-context.ts first.
 */
const LOCAL_SCRIPT_USER: CurrentUser = {
  userId: "local-script",
  username: "local-script",
  fullName: "Local script",
  role: "ADMIN",
  assignedModalities: [],
  mustChangePassword: false,
};

function isLocalScript(): boolean {
  return !process.env.NEXT_RUNTIME && process.env.RADITRACK_LOCAL_SCRIPT === "1";
}

/** Any signed-in staff member who has set their own password. */
export async function requireUser(): Promise<CurrentUser> {
  if (isLocalScript()) return LOCAL_SCRIPT_USER;
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Your session has ended. Please sign in again.");
  if (user.mustChangePassword) {
    throw new AuthorizationError("Please set a new password before continuing.");
  }
  return user;
}

/** Administrators only: accounts, settings, imports, test data and the RIS Simulator. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new AuthorizationError("Only an administrator can do this.");
  }
  return user;
}

// ---------------------------------------------------------------------------
// Pages: redirect instead of throwing.
// ---------------------------------------------------------------------------

export async function requirePageUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

export async function requirePageAdmin(): Promise<CurrentUser> {
  const user = await requirePageUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
