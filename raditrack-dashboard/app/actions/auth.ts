"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/auth/session";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/dal";
import { isUserRole } from "@/lib/auth/roles";

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 5;
const GENERIC_LOGIN_ERROR = "Incorrect username or password.";

// Compared against when the username does not exist, so both cases take the same time.
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("raditrack-unknown-user");
  return dummyHash;
}

export interface AuthFormState {
  error?: string;
  /** Shown after a voluntary password change on the Settings page. */
  success?: string;
  /** Echoed back so the username field keeps its value after an error. */
  username?: string;
}

function normalizeUsername(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = normalizeUsername(formData.get("username"));
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";

  if (!username || !password) {
    return { error: "Enter your username and password.", username };
  }

  const account = await prisma.userAccount.findUnique({ where: { username } });

  if (!account) {
    await verifyPassword(password, await getDummyHash());
    return { error: GENERIC_LOGIN_ERROR, username };
  }

  const now = new Date();
  if (account.lockedUntil && account.lockedUntil > now) {
    const minutes = Math.ceil((account.lockedUntil.getTime() - now.getTime()) / 60000);
    return {
      error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      username,
    };
  }

  const isValid = account.isActive && (await verifyPassword(password, account.passwordHash));

  if (!isValid) {
    const failedLoginCount = account.failedLoginCount + 1;
    const shouldLock = failedLoginCount >= MAX_FAILED_LOGINS;
    await prisma.userAccount.update({
      where: { userId: account.userId },
      data: {
        failedLoginCount: shouldLock ? 0 : failedLoginCount,
        lockedUntil: shouldLock ? new Date(now.getTime() + LOCKOUT_MINUTES * 60000) : null,
      },
    });
    return { error: GENERIC_LOGIN_ERROR, username };
  }

  if (!isUserRole(account.role)) {
    return { error: "This account has no valid role. Ask an administrator to fix it.", username };
  }

  await prisma.userAccount.update({
    where: { userId: account.userId },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });

  await createSession({
    userId: account.userId,
    role: account.role,
    sessionVersion: account.sessionVersion,
  });

  redirect(account.mustChangePassword ? "/change-password" : "/");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

export async function changePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const account = await prisma.userAccount.findUnique({ where: { userId: user.userId } });
  if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
    return { error: "Your current password is incorrect." };
  }

  const problem = passwordProblem(newPassword);
  if (problem) return { error: problem };
  if (newPassword !== confirmPassword) return { error: "The new passwords do not match." };
  if (newPassword === currentPassword) {
    return { error: "Choose a password different from the current one." };
  }

  const updated = await prisma.userAccount.update({
    where: { userId: user.userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
  });

  // Other devices are signed out; this one gets a fresh session.
  await createSession({
    userId: updated.userId,
    role: user.role,
    sessionVersion: updated.sessionVersion,
  });

  // First sign-in: continue to the dashboard. From Settings: stay and confirm.
  if (user.mustChangePassword) redirect("/");
  return { success: "Password changed. Your other devices were signed out." };
}
