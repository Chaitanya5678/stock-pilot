import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { recordShiftEntry } from "./recordShiftEntry";
import { getCurrentShiftIncharge } from "./getCurrentShiftIncharge";

beforeEach(async () => {
  await resetDatabase();
});

describe("getCurrentShiftIncharge", () => {
  it("is null when there are no shift entries", async () => {
    const current = await getCurrentShiftIncharge(Role.STORE_OPERATOR);
    expect(current.inchargeId).toBeNull();
  });

  it("reflects the sole entry once it has taken effect", async () => {
    await recordShiftEntry({
      inchargeId: "INC-1",
      effectiveAt: new Date(Date.now() - 60_000).toISOString(),
      performedByRole: Role.ADMIN,
    });
    const current = await getCurrentShiftIncharge(Role.MAINTENANCE_USER);
    expect(current.inchargeId).toBe("INC-1");
  });

  it("is null for a sole entry that is still in the future", async () => {
    await recordShiftEntry({
      inchargeId: "INC-1",
      effectiveAt: new Date(Date.now() + 60_000 * 60).toISOString(),
      performedByRole: Role.ADMIN,
    });
    const current = await getCurrentShiftIncharge(Role.ADMIN);
    expect(current.inchargeId).toBeNull();
  });

  it("picks the latest applicable entry among several", async () => {
    const now = Date.now();
    await recordShiftEntry({ inchargeId: "OLDEST", effectiveAt: new Date(now - 3 * 60_000).toISOString(), performedByRole: Role.ADMIN });
    await recordShiftEntry({ inchargeId: "MIDDLE", effectiveAt: new Date(now - 2 * 60_000).toISOString(), performedByRole: Role.ADMIN });
    await recordShiftEntry({ inchargeId: "FUTURE", effectiveAt: new Date(now + 60 * 60_000).toISOString(), performedByRole: Role.ADMIN });

    const current = await getCurrentShiftIncharge(Role.STORE_MANAGER);
    expect(current.inchargeId).toBe("MIDDLE");
  });

  it("end-to-end: recording an entry immediately changes the derived current in-charge (record -> persist -> derive)", async () => {
    const before = await getCurrentShiftIncharge(Role.ADMIN);
    expect(before.inchargeId).toBeNull();

    await recordShiftEntry({
      inchargeId: "INC-NEW",
      effectiveAt: new Date(Date.now() - 1000).toISOString(),
      performedByRole: Role.STORE_MANAGER,
    });

    const after = await getCurrentShiftIncharge(Role.ADMIN);
    expect(after.inchargeId).toBe("INC-NEW");
  });
});
