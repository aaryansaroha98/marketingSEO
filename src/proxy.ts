import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ detail: "Owner authentication is not configured" }, { status: 503 });
    }
    const setupUrl = new URL("/login", request.url);
    setupUrl.searchParams.set("setup", "required");
    return NextResponse.redirect(setupUrl);
  }

  const authenticated = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, secret);
  if (authenticated) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ detail: "Owner authentication required" }, { status: 401 });
  }
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/app/:path*", "/api/backend/:path*"],
};
