import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { resetDatabase } from "@/test/resetDatabase";
import { createTestUser } from "@/test/fixtures";
import { performRecordShiftEntry } from "./shiftActions";

beforeEach(async () => {
  await resetDatabase();
});

async function sessionFor(role: Role) {
  const user = await createTestUser({ role });
  return { userId: user.id, role, email: user.email, displayName: user.displayName };
}

describe("performRecordShiftEntry", () => {
  it("records an entry for an authorized session", async () => {
    const session = await sessionFor(Role.STORE_MANAGER);
    const result = await performRecordShiftEntry(session, { inchargeId: "INC-204", effectiveAt: new Date().toISOString() });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const stored = await prisma.shiftInchargeEntry.findUniqueOrThrow({ where: { id: result.id } });
      expect(stored.inchargeId).toBe("INC-204");
    }
  });

  it("rejects an unauthorized role with a permission message, not a stack trace", async () => {
    const session = await sessionFor(Role.STORE_OPERATOR);
    const result = await performRecordShiftEntry(session, { inchargeId: "INC-204", effectiveAt: new Date().toISOString() });
    expect(result).toEqual({ ok: false, error: "You do not have permission to perform this action." });
  });

  it("rejects invalid input with a friendly message", async () => {
    const session = await sessionFor(Role.ADMIN);
    const result = await performRecordShiftEntry(session, { inchargeId: "", effectiveAt: new Date().toISOString() });
    expect(result.ok).toBe(false);
  });

  it("rejects malformed input before it reaches the domain layer", async () => {
    const session = await sessionFor(Role.ADMIN);
    const result = await performRecordShiftEntry(session, {});
    expect(result).toEqual({ ok: false, error: "Please check the shift details and try again." });
  });
});
