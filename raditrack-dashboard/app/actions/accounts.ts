"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { MODALITY_ORDER } from "@/lib/enums";

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const MAX_NAME_LENGTH = 80;

export interface AccountSummary {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  assignedModalities: string[];
  isActive: boolean;
  mustChangePassword: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
}

export type AccountResult =
  | { success: true; temporaryPassword?: string }
  | { success: false; error: string };

interface AccountInput {
  fullName: string;
  username: string;
  role: string;
  assignedModalities: string[];
}

function cleanModalities(codes: readonly string[]): string[] | null {
  const unique = [...new Set(codes)];
  const known = MODALITY_ORDER as readonly string[];
  return unique.every((code) => known.includes(code)) ? unique : null;
}

function validate(input: AccountInput): { error: string } | { value: AccountInput & { role: UserRole } } {
  const fullName = input.fullName.trim();
  const username = input.username.trim().toLowerCase();
  if (!fullName || fullName.length > MAX_NAME_LENGTH) {
    return { error: `Enter a name of up to ${MAX_NAME_LENGTH} characters.` };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { error: "Usernames use 3–32 lowercase letters, numbers, dots, dashes or underscores." };
  }
  if (!isUserRole(input.role)) return { error: "Choose a role." };
  const assignedModalities = cleanModalities(input.assignedModalities);
  if (!assignedModalities) return { error: "One of the selected modalities is not recognised." };
  return { value: { fullName, username, role: input.role, assignedModalities } };
}

/** Refuses changes that would leave nobody able to manage accounts. */
async function wouldRemoveLastAdmin(userId: string, nextRole: string, nextActive: boolean): Promise<boolean> {
  if (nextRole === "ADMIN" && nextActive) return false;
  const target = await prisma.userAccount.findUnique({ where: { userId }, select: { role: true, isActive: true } });
  if (!target || target.role !== "ADMIN" || !target.isActive) return false;
  const activeAdmins = await prisma.userAccount.count({ where: { role: "ADMIN", isActive: true } });
  return activeAdmins <= 1;
}

export async function listAccountsAction(): Promise<AccountSummary[]> {
  await requireAdmin();
  const now = new Date();
  const accounts = await prisma.userAccount.findMany({
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
  });
  return accounts
    .filter((account) => isUserRole(account.role))
    .map((account) => ({
      userId: account.userId,
      username: account.username,
      fullName: account.fullName,
      role: account.role as UserRole,
      assignedModalities: account.assignedModalities,
      isActive: account.isActive,
      mustChangePassword: account.mustChangePassword,
      isLocked: account.lockedUntil !== null && account.lockedUntil > now,
      lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
    }));
}

export async function createAccountAction(input: AccountInput): Promise<AccountResult> {
  await requireAdmin();
  const checked = validate(input);
  if ("error" in checked) return { success: false, error: checked.error };

  const existing = await prisma.userAccount.findUnique({ where: { username: checked.value.username } });
  if (existing) return { success: false, error: "That username is already taken." };

  const temporaryPassword = generateTemporaryPassword();
  await prisma.userAccount.create({
    data: {
      ...checked.value,
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    },
  });

  revalidatePath("/");
  return { success: true, temporaryPassword };
}

export async function updateAccountAction(userId: string, input: AccountInput): Promise<AccountResult> {
  const admin = await requireAdmin();
  const checked = validate(input);
  if ("error" in checked) return { success: false, error: checked.error };

  const target = await prisma.userAccount.findUnique({ where: { userId } });
  if (!target) return { success: false, error: "That account no longer exists." };

  if (userId === admin.userId && checked.value.role !== "ADMIN") {
    return { success: false, error: "You can't remove your own administrator role." };
  }
  if (await wouldRemoveLastAdmin(userId, checked.value.role, target.isActive)) {
    return { success: false, error: "At least one active administrator is needed." };
  }

  const clash = await prisma.userAccount.findFirst({
    where: { username: checked.value.username, NOT: { userId } },
  });
  if (clash) return { success: false, error: "That username is already taken." };

  const roleChanged = target.role !== checked.value.role;
  await prisma.userAccount.update({
    where: { userId },
    data: {
      ...checked.value,
      // A new role takes effect at the next sign-in.
      ...(roleChanged ? { sessionVersion: { increment: 1 } } : {}),
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function resetAccountPasswordAction(userId: string): Promise<AccountResult> {
  const admin = await requireAdmin();
  if (userId === admin.userId) {
    return { success: false, error: "Use Change password to change your own password." };
  }

  const temporaryPassword = generateTemporaryPassword();
  const updated = await prisma.userAccount.updateMany({
    where: { userId },
    data: {
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  });
  if (updated.count === 0) return { success: false, error: "That account no longer exists." };

  revalidatePath("/");
  return { success: true, temporaryPassword };
}

export async function setAccountActiveAction(userId: string, isActive: boolean): Promise<AccountResult> {
  const admin = await requireAdmin();
  if (userId === admin.userId && !isActive) {
    return { success: false, error: "You can't deactivate your own account." };
  }

  const target = await prisma.userAccount.findUnique({ where: { userId }, select: { role: true } });
  if (!target) return { success: false, error: "That account no longer exists." };
  if (await wouldRemoveLastAdmin(userId, target.role, isActive)) {
    return { success: false, error: "At least one active administrator is needed." };
  }

  await prisma.userAccount.update({
    where: { userId },
    data: {
      isActive,
      failedLoginCount: 0,
      lockedUntil: null,
      // Signs the account out everywhere when it is deactivated.
      ...(isActive ? {} : { sessionVersion: { increment: 1 } }),
    },
  });

  revalidatePath("/");
  return { success: true };
}
