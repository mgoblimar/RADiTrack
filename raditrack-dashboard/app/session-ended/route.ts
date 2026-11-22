import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Clears a sign-in cookie that no longer matches a usable account (deleted or
 * deactivated account, password reset, role change), then shows the sign-in page.
 *
 * Without this, the page guard sends the person to /login, and the proxy (which
 * only checks the cookie's signature) sends them straight back: an endless redirect.
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.nextUrl));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
