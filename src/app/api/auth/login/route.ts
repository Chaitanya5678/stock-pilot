import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/application/auth/authenticate";
import { signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/infrastructure/auth/session";
import { UnauthenticatedError } from "@/domain/errors";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  try {
    const user = await authenticate(parsed.data);
    const token = await signSession({
      userId: user.id,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}
