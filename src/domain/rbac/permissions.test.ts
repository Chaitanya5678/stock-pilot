import { describe, expect, it } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { ForbiddenError } from "@/domain/errors";
import { hasPermission, requirePermission } from "./permissions";

describe("hasPermission", () => {
  it("grants ADMIN every defined permission", () => {
    expect(hasPermission(Role.ADMIN, "stock:add")).toBe(true);
    expect(hasPermission(Role.ADMIN, "stock:adjust")).toBe(true);
    expect(hasPermission(Role.ADMIN, "users:manage")).toBe(true);
  });

  it("lets STORE_MANAGER manage the catalog and adjust stock", () => {
    expect(hasPermission(Role.STORE_MANAGER, "catalog:manage")).toBe(true);
    expect(hasPermission(Role.STORE_MANAGER, "stock:adjust")).toBe(true);
    expect(hasPermission(Role.STORE_MANAGER, "users:manage")).toBe(false);
  });

  it("lets STORE_OPERATOR add/consume but not adjust or manage the catalog", () => {
    expect(hasPermission(Role.STORE_OPERATOR, "stock:add")).toBe(true);
    expect(hasPermission(Role.STORE_OPERATOR, "stock:consume")).toBe(true);
    expect(hasPermission(Role.STORE_OPERATOR, "stock:adjust")).toBe(false);
    expect(hasPermission(Role.STORE_OPERATOR, "catalog:manage")).toBe(false);
  });

  it("restricts MAINTENANCE_USER to consuming and viewing", () => {
    expect(hasPermission(Role.MAINTENANCE_USER, "stock:consume")).toBe(true);
    expect(hasPermission(Role.MAINTENANCE_USER, "stock:add")).toBe(false);
    expect(hasPermission(Role.MAINTENANCE_USER, "stock:adjust")).toBe(false);
    expect(hasPermission(Role.MAINTENANCE_USER, "catalog:manage")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("does not throw when the role has the permission", () => {
    expect(() => requirePermission(Role.STORE_MANAGER, "stock:adjust")).not.toThrow();
  });

  it("throws ForbiddenError when the role lacks the permission", () => {
    expect(() => requirePermission(Role.MAINTENANCE_USER, "stock:add")).toThrow(ForbiddenError);
  });
});
