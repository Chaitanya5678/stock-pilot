import { describe, expect, it } from "vitest";
import { MovementDirection, Role } from "@/generated/prisma/enums";
import { ForbiddenError } from "@/domain/errors";
import { allowedMovementDirections, assertRoleCanPerformMovement } from "./movementPermissions";

describe("allowedMovementDirections", () => {
  it("gives ADMIN and STORE_MANAGER all three directions", () => {
    expect(allowedMovementDirections(Role.ADMIN)).toEqual(
      expect.arrayContaining([MovementDirection.ADD, MovementDirection.CONSUME, MovementDirection.ADJUSTMENT]),
    );
    expect(allowedMovementDirections(Role.STORE_MANAGER)).toEqual(
      expect.arrayContaining([MovementDirection.ADD, MovementDirection.CONSUME, MovementDirection.ADJUSTMENT]),
    );
  });

  it("gives STORE_OPERATOR add/consume but not adjustment", () => {
    const directions = allowedMovementDirections(Role.STORE_OPERATOR);
    expect(directions).toEqual(expect.arrayContaining([MovementDirection.ADD, MovementDirection.CONSUME]));
    expect(directions).not.toContain(MovementDirection.ADJUSTMENT);
  });

  it("gives MAINTENANCE_USER only consume", () => {
    expect(allowedMovementDirections(Role.MAINTENANCE_USER)).toEqual([MovementDirection.CONSUME]);
  });
});

describe("assertRoleCanPerformMovement", () => {
  it("allows STORE_OPERATOR to add/consume", () => {
    expect(() => assertRoleCanPerformMovement(Role.STORE_OPERATOR, MovementDirection.ADD, null)).not.toThrow();
    expect(() => assertRoleCanPerformMovement(Role.STORE_OPERATOR, MovementDirection.CONSUME, null)).not.toThrow();
  });

  it("blocks STORE_OPERATOR from adjusting", () => {
    expect(() => assertRoleCanPerformMovement(Role.STORE_OPERATOR, MovementDirection.ADJUSTMENT, null)).toThrow(
      ForbiddenError,
    );
  });

  it("allows MAINTENANCE_USER to consume a machine-linked item", () => {
    expect(() =>
      assertRoleCanPerformMovement(Role.MAINTENANCE_USER, MovementDirection.CONSUME, "machine-1"),
    ).not.toThrow();
  });

  it("blocks MAINTENANCE_USER from consuming a store-only item", () => {
    expect(() => assertRoleCanPerformMovement(Role.MAINTENANCE_USER, MovementDirection.CONSUME, null)).toThrow(
      ForbiddenError,
    );
  });

  it("blocks MAINTENANCE_USER from adding stock at all", () => {
    expect(() => assertRoleCanPerformMovement(Role.MAINTENANCE_USER, MovementDirection.ADD, "machine-1")).toThrow(
      ForbiddenError,
    );
  });
});
