import { describe, expect, it } from "vitest";
import { stockStatus } from "./stockStatus";

describe("stockStatus", () => {
  it("is OUT_OF_STOCK when stock is zero", () => {
    expect(stockStatus(0, 10)).toBe("OUT_OF_STOCK");
  });

  it("is LOW_STOCK when stock is above zero but at or below threshold", () => {
    expect(stockStatus(5, 10)).toBe("LOW_STOCK");
    expect(stockStatus(10, 10)).toBe("LOW_STOCK");
  });

  it("is IN_STOCK when stock is above threshold", () => {
    expect(stockStatus(11, 10)).toBe("IN_STOCK");
  });

  it("accepts string/decimal-like inputs", () => {
    expect(stockStatus("0.00", "10")).toBe("OUT_OF_STOCK");
  });

  it("with a zero threshold, any stock above zero is IN_STOCK (LOW_STOCK is unreachable)", () => {
    expect(stockStatus(0, 0)).toBe("OUT_OF_STOCK");
    expect(stockStatus(1, 0)).toBe("IN_STOCK");
  });
});
