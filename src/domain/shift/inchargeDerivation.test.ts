import { describe, expect, it } from "vitest";
import { deriveInchargeAt } from "./inchargeDerivation";

describe("deriveInchargeAt", () => {
  const entries = [
    { inchargeId: "INC-1", effectiveAt: new Date("2026-01-01T00:00:00Z") },
    { inchargeId: "INC-2", effectiveAt: new Date("2026-01-10T00:00:00Z") },
    { inchargeId: "INC-3", effectiveAt: new Date("2026-01-20T00:00:00Z") },
  ];

  it("returns the entry with the latest effectiveAt <= the given time", () => {
    expect(deriveInchargeAt(entries, new Date("2026-01-15T00:00:00Z"))).toBe("INC-2");
  });

  it("returns null when no entry applies yet", () => {
    expect(deriveInchargeAt(entries, new Date("2025-12-31T00:00:00Z"))).toBeNull();
  });

  it("returns the latest entry when the given time is after all of them", () => {
    expect(deriveInchargeAt(entries, new Date("2026-06-01T00:00:00Z"))).toBe("INC-3");
  });

  it("is inclusive at an exact effectiveAt match", () => {
    expect(deriveInchargeAt(entries, new Date("2026-01-10T00:00:00Z"))).toBe("INC-2");
  });

  it("breaks a timestamp tie by preferring the later array entry", () => {
    const tied = [
      { inchargeId: "FIRST", effectiveAt: new Date("2026-01-01T00:00:00Z") },
      { inchargeId: "SECOND", effectiveAt: new Date("2026-01-01T00:00:00Z") },
    ];
    expect(deriveInchargeAt(tied, new Date("2026-01-01T00:00:00Z"))).toBe("SECOND");
  });
});
