import { describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { signSession, verifySession } from "./session";

const basePayload = { userId: "user-1", role: Role.STORE_MANAGER, email: "a@example.test", displayName: "A Manager" };

describe("session tokens", () => {
  it("round-trips a signed payload", async () => {
    const token = await signSession(basePayload);
    const payload = await verifySession(token);
    expect(payload).toEqual(basePayload);
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(basePayload);
    const tampered = `${token.slice(0, -2)}xx`;
    await expect(verifySession(tampered)).resolves.toBeNull();
  });

  it("rejects garbage input", async () => {
    await expect(verifySession("not-a-jwt")).resolves.toBeNull();
  });
});
