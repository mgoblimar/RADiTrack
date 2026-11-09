/**
 * Creates the first RADiTrack administrator, or resets an existing one's password.
 *
 * Usage (values come from the environment, never from the code):
 *   ADMIN_USERNAME=admin ADMIN_FULL_NAME="RADiTrack Admin" ADMIN_PASSWORD=... npm run auth:create-admin
 *
 * The password must be changed at first sign-in.
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { hashPassword, passwordProblem } from "@/lib/auth/password";

async function main(): Promise<void> {
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || "RADiTrack Administrator";
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error("Set ADMIN_USERNAME (3–32 lowercase letters, numbers, dots, dashes or underscores).");
  }
  const problem = passwordProblem(password);
  if (problem) throw new Error(`ADMIN_PASSWORD: ${problem}`);

  const passwordHash = await hashPassword(password);
  const account = await prisma.userAccount.upsert({
    where: { username },
    create: { username, fullName, role: "ADMIN", passwordHash, mustChangePassword: true },
    update: {
      role: "ADMIN",
      passwordHash,
      isActive: true,
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  });

  console.log(`Administrator "${account.username}" is ready. They must change the password at first sign-in.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
