import "./loadEnv";
import { Role, ItemCategory, Criticality, UnitOfMeasure, MovementDirection } from "@/generated/prisma/enums";
import { prisma } from "@/infrastructure/db/prismaClient";
import { hashPassword } from "@/infrastructure/auth/password";
import { createInventoryItem } from "@/application/catalog/createInventoryItem";
import { recordStockMovement } from "@/application/stock/recordStockMovement";

/**
 * Development-only seed data. Reproduces the scenarios documented in
 * docs/DATA_MIGRATION.md §2 (multiple departments/machines/units, normal /
 * zero / low stock, every category, a movement history). This is NOT
 * production data — every user this script creates has isSeedUser: true and
 * a clearly fake @stockpilot.local email. Safe to re-run: it exits early if
 * the database already has departments.
 */

const DEV_PASSWORD = "DevPassword123!";
const DAY_MS = 24 * 60 * 60 * 1000;

async function backdateMovement(movementId: string, daysAgo: number) {
  await prisma.stockMovement.update({
    where: { id: movementId },
    data: { createdAt: new Date(Date.now() - daysAgo * DAY_MS) },
  });
}

async function main() {
  const alreadySeeded = (await prisma.department.count()) > 0;
  if (alreadySeeded) {
    console.log("Seed skipped: departments already exist. Nothing to do.");
    return;
  }

  console.log("Seeding development data (isSeedUser=true, non-production)...");

  // --- Users ---------------------------------------------------------------
  const passwordHash = await hashPassword(DEV_PASSWORD);
  const [admin, manager, operator, maintenance] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@stockpilot.local",
        passwordHash,
        displayName: "Dev Admin",
        role: Role.ADMIN,
        isSeedUser: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "manager@stockpilot.local",
        passwordHash,
        displayName: "Dev Store Manager",
        role: Role.STORE_MANAGER,
        isSeedUser: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "operator@stockpilot.local",
        passwordHash,
        displayName: "Dev Store Operator",
        role: Role.STORE_OPERATOR,
        isSeedUser: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "maintenance@stockpilot.local",
        passwordHash,
        displayName: "Dev Maintenance User",
        role: Role.MAINTENANCE_USER,
        isSeedUser: true,
      },
    }),
  ]);

  // --- Departments -----------------------------------------------------------
  const [maintenanceDept, productionDept, utilitiesDept, safetyDept] = await Promise.all([
    prisma.department.create({ data: { name: "Maintenance", code: "MNT" } }),
    prisma.department.create({ data: { name: "Production", code: "PRD" } }),
    prisma.department.create({ data: { name: "Utilities", code: "UTL" } }),
    prisma.department.create({ data: { name: "Safety", code: "SAF" } }),
  ]);
  await prisma.department.create({ data: { name: "Stores", code: "STR" } });

  // --- Machines ----------------------------------------------------------
  const compressor = await prisma.machine.create({
    data: {
      name: "Compressor Series C",
      code: "CMP",
      departmentId: maintenanceDept.id,
      cost: 18000,
      vendor: "Atlas Service Co.",
      warrantyUntil: new Date("2027-11-30"),
    },
  });
  const boiler = await prisma.machine.create({
    data: {
      name: "Boiler, High Pressure",
      code: "BOL",
      departmentId: utilitiesDept.id,
      cost: 12400,
      vendor: "Thermal Systems Ltd.",
      warrantyUntil: new Date("2027-06-15"),
    },
  });
  const packagingLine = await prisma.machine.create({
    data: {
      name: "Packaging Line A",
      code: "PKG",
      departmentId: productionDept.id,
      cost: 31500,
      vendor: "PackPro Automation",
      warrantyUntil: new Date("2028-02-20"),
    },
  });
  const safetyStore = await prisma.machine.create({
    data: { name: "Safety Store", code: "SFT", departmentId: safetyDept.id, cost: 0, vendor: "Internal Stores" },
  });

  // --- Machine units -------------------------------------------------------
  const [compressorUnit, boiler01, , , packagingUnit, safetyUnit] = await Promise.all([
    prisma.machineUnit.create({ data: { machineId: compressor.id, name: "Compressor C-01" } }),
    prisma.machineUnit.create({ data: { machineId: boiler.id, name: "Boiler 01" } }),
    prisma.machineUnit.create({ data: { machineId: boiler.id, name: "Boiler 02" } }),
    prisma.machineUnit.create({ data: { machineId: boiler.id, name: "Boiler 03" } }),
    prisma.machineUnit.create({ data: { machineId: packagingLine.id, name: "Packaging Line A-01" } }),
    prisma.machineUnit.create({ data: { machineId: safetyStore.id, name: "Safety Store Unit" } }),
  ]);

  // --- Inventory items: one per category/criticality combination used in
  // the reference, including a zero-stock and a below-threshold item -------
  // Opening stock is chosen so that replaying the movements recorded below
  // through the real transactional use-case lands on the same "current
  // stock" figure the reference prototype hardcoded — unlike the reference
  // (a static in-memory array where the item's stock and its movement log
  // could be set independently), this seed must be internally consistent:
  // opening + Σ(movements) = the intended demo end-state.
  const bearing = await createInventoryItem({
    name: "Bearing, Ball, Sealed, 20mm ID",
    departmentId: maintenanceDept.id,
    machineId: compressor.id,
    category: ItemCategory.OPERATING_SPARES,
    criticality: Criticality.VITAL,
    rack: "A-03-12",
    unitOfMeasure: UnitOfMeasure.EACH,
    stock: 29, // +20 add, -5 consume, -2 adjustment below => ends at 42
    threshold: 12,
    price: 69.99,
    performedByRole: Role.ADMIN,
  });
  const hydraulicOil = await createInventoryItem({
    name: "Oil, Hydraulic, ISO 46, 20L",
    departmentId: utilitiesDept.id,
    machineId: boiler.id,
    category: ItemCategory.CONSUMABLES,
    criticality: Criticality.ESSENTIAL,
    rack: "B-01-03",
    unitOfMeasure: UnitOfMeasure.LITRE,
    stock: 16, // -8 consume below => ends at 8, below threshold (low stock demo item)
    threshold: 15,
    price: 18.5,
    performedByRole: Role.ADMIN,
  });
  const torqueWrench = await createInventoryItem({
    name: "Wrench, Torque, 1/2-inch Drive",
    departmentId: maintenanceDept.id,
    machineId: compressor.id,
    category: ItemCategory.DURABLE_TOOLS,
    criticality: Criticality.VITAL,
    rack: "T-02-06",
    unitOfMeasure: UnitOfMeasure.EACH,
    stock: 19, // -2 consume below => ends at 17
    threshold: 5,
    price: 249.0,
    performedByRole: Role.ADMIN,
  });
  const airFilter = await createInventoryItem({
    name: "Filter, Air, Compressor Unit 2",
    departmentId: productionDept.id,
    machineId: packagingLine.id,
    category: ItemCategory.OPERATING_SPARES,
    criticality: Criticality.ESSENTIAL,
    rack: "A-04-02",
    unitOfMeasure: UnitOfMeasure.EACH,
    stock: 12, // -12 consume below => ends at 0 (out-of-stock demo item)
    threshold: 30,
    price: 1.25,
    performedByRole: Role.ADMIN,
  });
  const gloves = await createInventoryItem({
    name: "Gloves, Nitrile, Chemical Resistant",
    departmentId: safetyDept.id,
    machineId: safetyStore.id,
    category: ItemCategory.SAFETY_PPE,
    criticality: Criticality.VITAL,
    rack: "S-01-09",
    unitOfMeasure: UnitOfMeasure.PAIR,
    stock: 41, // -7 consume, -10 consume below => ends at 24
    threshold: 10,
    price: 44.99,
    performedByRole: Role.ADMIN,
  });
  await createInventoryItem({
    name: "Seal, O-Ring, Nitrile 25mm",
    departmentId: maintenanceDept.id,
    machineId: compressor.id,
    category: ItemCategory.OPERATING_SPARES,
    criticality: Criticality.ESSENTIAL,
    rack: "A-03-08",
    unitOfMeasure: UnitOfMeasure.EACH,
    stock: 6, // below threshold — low stock demo item
    threshold: 10,
    price: 12.0,
    performedByRole: Role.ADMIN,
  });
  await createInventoryItem({
    name: "Valve, Ball, Stainless Steel, 2-inch",
    departmentId: utilitiesDept.id,
    machineId: boiler.id,
    category: ItemCategory.CAPITAL_SPARES,
    criticality: Criticality.DESIRABLE,
    rack: "C-02-04",
    unitOfMeasure: UnitOfMeasure.EACH,
    stock: 31,
    threshold: 10,
    price: 39.95,
    performedByRole: Role.ADMIN,
  });

  // --- Shift in-charge log ---------------------------------------------------
  await prisma.shiftInchargeEntry.createMany({
    data: [
      { inchargeId: "INC-191", effectiveAt: new Date(Date.now() - 20 * DAY_MS) },
      { inchargeId: "INC-207", effectiveAt: new Date(Date.now() - 4 * DAY_MS) },
      { inchargeId: "INC-118", effectiveAt: new Date(Date.now() - 1 * DAY_MS) },
      { inchargeId: "INC-204", effectiveAt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    ],
  });

  // --- Stock movement history, via the real transactional use case --------
  const openingBearing = await recordStockMovement({
    itemId: bearing.id,
    direction: MovementDirection.ADD,
    quantity: 20,
    performedByUserId: manager.id,
    employeeLabel: "EMP-104",
    performedByRole: Role.STORE_MANAGER,
  });
  await backdateMovement(openingBearing.movementId, 15);

  const bearingConsume = await recordStockMovement({
    itemId: bearing.id,
    direction: MovementDirection.CONSUME,
    quantity: 5,
    machineUnitId: compressorUnit.id,
    performedByUserId: operator.id,
    employeeLabel: "EMP-104",
    performedByRole: Role.STORE_OPERATOR,
  });
  await backdateMovement(bearingConsume.movementId, 0.17);

  const glovesConsume = await recordStockMovement({
    itemId: gloves.id,
    direction: MovementDirection.CONSUME,
    machineUnitId: safetyUnit.id,
    quantity: 7,
    performedByUserId: maintenance.id,
    employeeLabel: "EMP-118",
    performedByRole: Role.MAINTENANCE_USER,
  });
  await backdateMovement(glovesConsume.movementId, 1);

  const oilConsume = await recordStockMovement({
    itemId: hydraulicOil.id,
    direction: MovementDirection.CONSUME,
    machineUnitId: boiler01.id,
    quantity: 8,
    performedByUserId: operator.id,
    employeeLabel: "EMP-101",
    performedByRole: Role.STORE_OPERATOR,
  });
  await backdateMovement(oilConsume.movementId, 3);

  const wrenchConsume = await recordStockMovement({
    itemId: torqueWrench.id,
    direction: MovementDirection.CONSUME,
    machineUnitId: compressorUnit.id,
    quantity: 2,
    performedByUserId: operator.id,
    employeeLabel: "EMP-109",
    performedByRole: Role.STORE_OPERATOR,
  });
  await backdateMovement(wrenchConsume.movementId, 5);

  const airFilterConsume = await recordStockMovement({
    itemId: airFilter.id,
    direction: MovementDirection.CONSUME,
    machineUnitId: packagingUnit.id,
    quantity: 12,
    performedByUserId: operator.id,
    employeeLabel: "EMP-112",
    performedByRole: Role.STORE_OPERATOR,
  });
  await backdateMovement(airFilterConsume.movementId, 11);

  const oldGlovesConsume = await recordStockMovement({
    itemId: gloves.id,
    direction: MovementDirection.CONSUME,
    machineUnitId: safetyUnit.id,
    quantity: 10,
    performedByUserId: maintenance.id,
    employeeLabel: "EMP-118",
    performedByRole: Role.MAINTENANCE_USER,
  });
  await backdateMovement(oldGlovesConsume.movementId, 20);

  const adjustment = await recordStockMovement({
    itemId: bearing.id,
    direction: MovementDirection.ADJUSTMENT,
    quantity: -2,
    reason: "Cycle count correction — 2 units found damaged on shelf",
    performedByUserId: manager.id,
    performedByRole: Role.STORE_MANAGER,
  });
  await backdateMovement(adjustment.movementId, 30);

  console.log("Seed complete:");
  console.log(`  Dev users (password: ${DEV_PASSWORD}):`);
  for (const user of [admin, manager, operator, maintenance]) {
    console.log(`    ${user.email} — ${user.role}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
