import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { isUserRole, type UserRole } from "./roles";

export const SESSION_COOKIE = "raditrack_session";

/** Signed-in sessions last one working shift plus margin. */
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const MIN_SECRET_LENGTH = 32;

export interface SessionPayload {
  userId: string;
  role: UserRole;
  /** Must match the account's sessionVersion, so password resets sign out old sessions. */
  sessionVersion: number;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters. Add it to .env (see .env.example).`,
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Secure cookies need HTTPS. Phones on the hospital Wi-Fi may reach the app over
 * plain HTTP, so this can be turned off with SESSION_COOKIE_SECURE=false.
 */
function isSecureCookie(): boolean {
  const setting = process.env.SESSION_COOKIE_SECURE;
  if (setting === "true") return true;
  if (setting === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + SESSION_DURATION_MS))
    .sign(secretKey());
}

/** Returns the session, or null when the token is missing, expired, tampered with or malformed. */
export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (
      typeof payload.userId !== "string" ||
      !isUserRole(payload.role) ||
      typeof payload.sessionVersion !== "number"
    ) {
      return null;
    }
    return { userId: payload.userId, role: payload.role, sessionVersion: payload.sessionVersion };
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
