import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from "./password";

describe("password hashing", () => {
  it("verifies a correct password against its own hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("never stores the plaintext password in the hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse battery staple");
  });

  it("the dummy hash used for timing-safety is a well-formed, never-matching bcrypt hash", async () => {
    await expect(verifyPassword("anything", DUMMY_PASSWORD_HASH)).resolves.toBe(false);
  });
});
