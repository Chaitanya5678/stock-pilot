import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySession, type SessionPayload } from "@/infrastructure/auth/session";

/** Reads and verifies the session cookie for the current request (server-only). */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
