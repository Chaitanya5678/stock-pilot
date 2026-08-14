import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { resetDatabase } from "@/test/resetDatabase";
import { ForbiddenError, ValidationError } from "@/domain/errors";
import { recordShiftEntry } from "./recordShiftEntry";

beforeEach(async () => {
  await resetDatabase();
});

describe("recordShiftEntry", () => {
  it("persists a new entry for an authorized role", async () => {
    const entry = await recordShiftEntry({
      inchargeId: "INC-204",
      effectiveAt: "2026-01-01T08:00:00.000Z",
      performedByRole: Role.STORE_MANAGER,
    });

    const stored = await prisma.shiftInchargeEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(stored.inchargeId).toBe("INC-204");
    expect(stored.effectiveAt.toISOString()).toBe("2026-01-01T08:00:00.000Z");
  });

  it("does not persist who recorded the entry — no such column exists", async () => {
    const entry = await recordShiftEntry({
      inchargeId: "INC-204",
      effectiveAt: new Date().toISOString(),
      performedByRole: Role.ADMIN,
    });
    expect(entry).not.toHaveProperty("performedByUserId");
    expect(entry).not.toHaveProperty("recordedByUserId");
  });

  it("allows two entries with the same effective timestamp (no overlap/uniqueness rule, matches the reference)", async () => {
    const timestamp = "2026-01-01T08:00:00.000Z";
    await recordShiftEntry({ inchargeId: "INC-1", effectiveAt: timestamp, performedByRole: Role.ADMIN });
    await expect(
      recordShiftEntry({ inchargeId: "INC-2", effectiveAt: timestamp, performedByRole: Role.ADMIN }),
    ).resolves.toBeTruthy();

    const count = await prisma.shiftInchargeEntry.count();
    expect(count).toBe(2);
  });

  it("rejects an unauthorized role", async () => {
    await expect(
      recordShiftEntry({ inchargeId: "INC-204", effectiveAt: new Date().toISOString(), performedByRole: Role.STORE_OPERATOR }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects invalid input", async () => {
    await expect(
      recordShiftEntry({ inchargeId: "", effectiveAt: new Date().toISOString(), performedByRole: Role.ADMIN }),
    ).rejects.toThrow(ValidationError);
    await expect(
      recordShiftEntry({ inchargeId: "INC-204", effectiveAt: "not-a-date", performedByRole: Role.ADMIN }),
    ).rejects.toThrow(ValidationError);
  });
});
