import { redirect } from "next/navigation";
import { getCurrentSession } from "@/infrastructure/auth/currentUser";
import type { SessionPayload } from "@/infrastructure/auth/session";

/** For Server Components: returns the session, or redirects to /login if there isn't one. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
