import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * A pre-computed, unused bcrypt hash used to keep the login failure path
 * doing real hashing work even when no user matches the given email — see
 * src/application/auth/authenticate.ts. Prevents a trivial timing
 * side-channel that would otherwise reveal whether an email is registered.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$12$k18Nfxqs8KtbRRA9cOR14.lMgf5isn5HLi6Sq715spwRRHehv9Hy.";
