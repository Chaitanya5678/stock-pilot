import { NextResponse } from "next/server";
import { sessionCookieOptions, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
