import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestUser } from "@/test/fixtures";
import { UnauthenticatedError } from "@/domain/errors";
import { authenticate } from "./authenticate";

beforeEach(async () => {
  await resetDatabase();
});

describe("authenticate", () => {
  it("succeeds with the correct email and password", async () => {
    const user = await createTestUser({ email: "manager@example.test", password: "correct-password", role: Role.STORE_MANAGER });

    const result = await authenticate({ email: "manager@example.test", password: "correct-password" });

    expect(result.id).toBe(user.id);
    expect(result.role).toBe(Role.STORE_MANAGER);
  });

  it("is case-insensitive on email", async () => {
    await createTestUser({ email: "manager@example.test", password: "correct-password" });
    await expect(authenticate({ email: "Manager@Example.Test", password: "correct-password" })).resolves.toBeTruthy();
  });

  it("rejects a wrong password", async () => {
    await createTestUser({ email: "manager@example.test", password: "correct-password" });
    await expect(authenticate({ email: "manager@example.test", password: "wrong-password" })).rejects.toThrow(
      UnauthenticatedError,
    );
  });

  it("rejects an email that does not exist", async () => {
    await expect(authenticate({ email: "nobody@example.test", password: "anything" })).rejects.toThrow(
      UnauthenticatedError,
    );
  });

  it("rejects a deactivated user even with the correct password", async () => {
    await createTestUser({ email: "inactive@example.test", password: "correct-password", isActive: false });
    await expect(authenticate({ email: "inactive@example.test", password: "correct-password" })).rejects.toThrow(
      UnauthenticatedError,
    );
  });
});
