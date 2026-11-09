// Shared by server and client code: no secrets or server imports here.

export const USER_ROLES = ["RADIOLOGIST", "RESIDENT", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  RADIOLOGIST: "Radiologist",
  RESIDENT: "Resident",
  ADMIN: "Administrator",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

/** The signed-in user as the UI sees it (no password or session data). */
export interface CurrentUser {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  /** Modality codes in the order the admin assigned them; the first is the default filter. */
  assignedModalities: string[];
  mustChangePassword: boolean;
}

export function isAdmin(user: Pick<CurrentUser, "role"> | null | undefined): boolean {
  return user?.role === "ADMIN";
}
