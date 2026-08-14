import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { resetDatabase } from "@/test/resetDatabase";
import { recordShiftEntry } from "./recordShiftEntry";
import { listShiftEntries } from "./listShiftEntries";

beforeEach(async () => {
  await resetDatabase();
});

describe("listShiftEntries", () => {
  it("returns an empty list when there is no history", async () => {
    await expect(listShiftEntries(Role.STORE_OPERATOR)).resolves.toEqual([]);
  });

  it("returns entries newest-effective-first", async () => {
    await recordShiftEntry({ inchargeId: "INC-1", effectiveAt: "2026-01-01T00:00:00Z", performedByRole: Role.ADMIN });
    await recordShiftEntry({ inchargeId: "INC-2", effectiveAt: "2026-01-10T00:00:00Z", performedByRole: Role.ADMIN });
    await recordShiftEntry({ inchargeId: "INC-3", effectiveAt: "2026-01-05T00:00:00Z", performedByRole: Role.ADMIN });

    const entries = await listShiftEntries(Role.MAINTENANCE_USER);
    expect(entries.map((e) => e.inchargeId)).toEqual(["INC-2", "INC-3", "INC-1"]);
  });

  it("respects the limit parameter, matching the reference's 'most recent 5'", async () => {
    for (let i = 0; i < 7; i += 1) {
      await recordShiftEntry({
        inchargeId: `INC-${i}`,
        effectiveAt: new Date(Date.now() - i * 60_000).toISOString(),
        performedByRole: Role.ADMIN,
      });
    }
    const entries = await listShiftEntries(Role.STORE_OPERATOR, 5);
    expect(entries).toHaveLength(5);
  });
});
