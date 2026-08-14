import { prisma } from "@/infrastructure/db/prismaClient";
import { verifyPassword, DUMMY_PASSWORD_HASH } from "@/infrastructure/auth/password";
import { UnauthenticatedError } from "@/domain/errors";
import type { Role } from "@/generated/prisma/enums";

export interface AuthenticateInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

/**
 * Verifies credentials against the users table. The authenticated user is
 * the sole authoritative identity for anything the reference prototype used
 * a free-text "Employee ID" for — see docs/DECISIONS.md "Audit identity".
 */
export async function authenticate(input: AuthenticateInput): Promise<AuthenticatedUser> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always run a bcrypt compare, even when no user matches, so a missing
  // account doesn't respond measurably faster than a wrong password.
  const passwordValid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !user.isActive || !passwordValid) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
}
