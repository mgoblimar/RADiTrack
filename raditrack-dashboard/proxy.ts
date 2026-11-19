import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decryptSession } from "@/lib/auth/session";

/** Pages anyone can open: the sign-in page, the waiting-area TV display, and the stale-cookie cleanup. */
const PUBLIC_PATHS = ["/login", "/patient", "/session-ended"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Optimistic check only (cookie signature and expiry, no database).
 * Every page and server action still checks the account itself through lib/auth/dal.ts.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // No "signed in, so leave /login" redirect here: this check cannot see the database, so a cookie
  // whose account was reset or deactivated would bounce between / and /login forever. The sign-in
  // page itself sends people who really are signed in to the dashboard.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await decryptSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals and static files (logos, icons, fonts).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)"],
};
