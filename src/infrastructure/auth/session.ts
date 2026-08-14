import { SignJWT, jwtVerify } from "jose";
import { Role } from "@/generated/prisma/enums";

export interface SessionPayload {
  userId: string;
  role: Role;
  email: string;
  displayName: string;
}

export const SESSION_COOKIE_NAME = "stockpilot_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Minimal hand-rolled JWT session, chosen over NextAuth/Auth.js for this
 * foundation because Auth.js v5 (the App-Router-compatible major version)
 * has no stable release yet — see docs/DECISIONS.md "Authentication
 * mechanism". The `SessionPayload` shape is small and framework-agnostic
 * on purpose so a library-based solution can replace this later without
 * touching the application/domain layers, which only depend on
 * {userId, role, email}.
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
    displayName: payload.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.displayName !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      role: payload.role as Role,
      email: payload.email,
      displayName: payload.displayName,
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
