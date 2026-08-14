import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/errors";
import { validateShiftEntryInput } from "./shiftValidation";

describe("validateShiftEntryInput", () => {
  it("accepts a well-formed entry", () => {
    const result = validateShiftEntryInput({ inchargeId: "INC-204", effectiveAt: "2026-01-01T08:00:00.000Z" });
    expect(result.inchargeId).toBe("INC-204");
    expect(result.effectiveAt).toBeInstanceOf(Date);
  });

  it("trims the in-charge id", () => {
    const result = validateShiftEntryInput({ inchargeId: "  INC-204  ", effectiveAt: new Date() });
    expect(result.inchargeId).toBe("INC-204");
  });

  it("rejects an empty or overlong in-charge id", () => {
    expect(() => validateShiftEntryInput({ inchargeId: "  ", effectiveAt: new Date() })).toThrow(ValidationError);
    expect(() => validateShiftEntryInput({ inchargeId: "x".repeat(21), effectiveAt: new Date() })).toThrow(
      ValidationError,
    );
  });

  it("accepts an in-charge id at the 20-character limit", () => {
    expect(() => validateShiftEntryInput({ inchargeId: "x".repeat(20), effectiveAt: new Date() })).not.toThrow();
  });

  it("rejects an invalid date", () => {
    expect(() => validateShiftEntryInput({ inchargeId: "INC-204", effectiveAt: "not-a-date" })).toThrow(
      ValidationError,
    );
  });

  it("does not restrict effectiveAt to the future or past (matches the reference — no bounds documented)", () => {
    expect(() =>
      validateShiftEntryInput({ inchargeId: "INC-204", effectiveAt: new Date("2000-01-01") }),
    ).not.toThrow();
    expect(() =>
      validateShiftEntryInput({ inchargeId: "INC-204", effectiveAt: new Date("2099-01-01") }),
    ).not.toThrow();
  });
});
