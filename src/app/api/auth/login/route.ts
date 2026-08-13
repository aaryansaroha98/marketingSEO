import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

function matches(value: string, expected: string): boolean {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const expected = process.env.OWNER_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!expected || expected.length < 12 || !secret || secret.length < 32) {
    return NextResponse.json({ detail: "Owner login is not configured securely" }, { status: 503 });
  }
  const body = await request.json().catch(() => ({})) as { password?: unknown };
  if (typeof body.password !== "string" || !matches(body.password, expected)) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json({ detail: "Incorrect owner password" }, { status: 401 });
  }
  const response = NextResponse.json({ status: "ok" });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
