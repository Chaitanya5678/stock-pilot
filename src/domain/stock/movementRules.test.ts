import { describe, expect, it } from "vitest";
import { MovementDirection } from "@/generated/prisma/enums";
import { ValidationError } from "@/domain/errors";
import { validateStockMovementRequest, movementDelta, isValidResultingStock } from "./movementRules";

describe("validateStockMovementRequest", () => {
  it("accepts a valid ADD for a store-only item", () => {
    const result = validateStockMovementRequest({
      direction: MovementDirection.ADD,
      quantity: 5,
      itemMachineId: null,
    });
    expect(result.quantity.toNumber()).toBe(5);
    expect(result.machineUnitId).toBeNull();
  });

  it("rejects zero or negative quantity for ADD/CONSUME", () => {
    expect(() =>
      validateStockMovementRequest({ direction: MovementDirection.ADD, quantity: 0, itemMachineId: null }),
    ).toThrow(ValidationError);
    expect(() =>
      validateStockMovementRequest({ direction: MovementDirection.CONSUME, quantity: -1, itemMachineId: null }),
    ).toThrow(ValidationError);
  });

  it("requires a machine unit to consume a machine-linked item", () => {
    expect(() =>
      validateStockMovementRequest({
        direction: MovementDirection.CONSUME,
        quantity: 1,
        itemMachineId: "machine-1",
      }),
    ).toThrow(/machine unit is required/i);
  });

  it("rejects a machine unit that belongs to a different machine model", () => {
    expect(() =>
      validateStockMovementRequest({
        direction: MovementDirection.CONSUME,
        quantity: 1,
        itemMachineId: "machine-1",
        machineUnitId: "unit-1",
        machineUnitMachineId: "machine-2",
      }),
    ).toThrow(/does not belong/i);
  });

  it("accepts a matching machine unit for a machine-linked consume", () => {
    const result = validateStockMovementRequest({
      direction: MovementDirection.CONSUME,
      quantity: 1,
      itemMachineId: "machine-1",
      machineUnitId: "unit-1",
      machineUnitMachineId: "machine-1",
    });
    expect(result.machineUnitId).toBe("unit-1");
  });

  it("rejects a machine unit supplied for a store-only item", () => {
    expect(() =>
      validateStockMovementRequest({
        direction: MovementDirection.CONSUME,
        quantity: 1,
        itemMachineId: null,
        machineUnitId: "unit-1",
      }),
    ).toThrow(/not linked to a machine/i);
  });

  it("rejects a machine unit supplied for an ADD movement", () => {
    expect(() =>
      validateStockMovementRequest({
        direction: MovementDirection.ADD,
        quantity: 1,
        itemMachineId: "machine-1",
        machineUnitId: "unit-1",
      }),
    ).toThrow(/only be supplied for consume/i);
  });

  it("requires a non-zero quantity and a reason for ADJUSTMENT", () => {
    expect(() =>
      validateStockMovementRequest({ direction: MovementDirection.ADJUSTMENT, quantity: 0, itemMachineId: null, reason: "recount" }),
    ).toThrow(/non-zero/i);
    expect(() =>
      validateStockMovementRequest({ direction: MovementDirection.ADJUSTMENT, quantity: 3, itemMachineId: null }),
    ).toThrow(/reason/i);
  });

  it("preserves the sign of an ADJUSTMENT quantity", () => {
    const result = validateStockMovementRequest({
      direction: MovementDirection.ADJUSTMENT,
      quantity: -4,
      itemMachineId: null,
      reason: "damaged stock write-off",
    });
    expect(result.quantity.toNumber()).toBe(-4);
    expect(result.reason).toBe("damaged stock write-off");
  });
});

describe("movementDelta", () => {
  it("is positive for ADD, negative for CONSUME, and passthrough for ADJUSTMENT", () => {
    const qty = validateStockMovementRequest({ direction: MovementDirection.ADD, quantity: 5, itemMachineId: null }).quantity;
    expect(movementDelta(MovementDirection.ADD, qty).toNumber()).toBe(5);
    expect(movementDelta(MovementDirection.CONSUME, qty).toNumber()).toBe(-5);

    const adj = validateStockMovementRequest({
      direction: MovementDirection.ADJUSTMENT,
      quantity: -2,
      itemMachineId: null,
      reason: "correction",
    }).quantity;
    expect(movementDelta(MovementDirection.ADJUSTMENT, adj).toNumber()).toBe(-2);
  });
});

describe("isValidResultingStock", () => {
  it("rejects a delta that would take stock below zero", () => {
    expect(isValidResultingStock(3, movementDelta(MovementDirection.CONSUME, movementFromQty(5)))).toBe(false);
  });

  it("allows a delta that keeps stock at or above zero", () => {
    expect(isValidResultingStock(5, movementDelta(MovementDirection.CONSUME, movementFromQty(5)))).toBe(true);
  });
});

function movementFromQty(quantity: number) {
  return validateStockMovementRequest({ direction: MovementDirection.CONSUME, quantity, itemMachineId: null }).quantity;
}
