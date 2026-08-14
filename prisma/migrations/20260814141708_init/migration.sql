-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STORE_MANAGER', 'STORE_OPERATOR', 'MAINTENANCE_USER');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('CAPITAL_SPARES', 'OPERATING_SPARES', 'ROTABLE_SPARES', 'CONSUMABLES', 'DURABLE_TOOLS', 'SAFETY_PPE');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('VITAL', 'ESSENTIAL', 'DESIRABLE');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('EACH', 'PAIR', 'KG', 'LITRE', 'METER', 'SET');

-- CreateEnum
CREATE TYPE "MovementDirection" AS ENUM ('ADD', 'CONSUME', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSeedUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vendor" TEXT,
    "warrantyUntil" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_units" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "machineId" TEXT,
    "category" "ItemCategory" NOT NULL,
    "criticality" "Criticality" NOT NULL,
    "rack" TEXT NOT NULL,
    "unitOfMeasure" "UnitOfMeasure" NOT NULL,
    "stock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "threshold" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "machineUnitId" TEXT,
    "direction" "MovementDirection" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "performedByUserId" TEXT NOT NULL,
    "employeeLabel" TEXT,
    "inchargeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_incharge_log" (
    "id" TEXT NOT NULL,
    "inchargeId" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_incharge_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "machines_code_key" ON "machines"("code");

-- CreateIndex
CREATE INDEX "machines_departmentId_idx" ON "machines"("departmentId");

-- CreateIndex
CREATE INDEX "machine_units_machineId_idx" ON "machine_units"("machineId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_sku_key" ON "inventory_items"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_barcode_key" ON "inventory_items"("barcode");

-- CreateIndex
CREATE INDEX "inventory_items_departmentId_idx" ON "inventory_items"("departmentId");

-- CreateIndex
CREATE INDEX "inventory_items_machineId_idx" ON "inventory_items"("machineId");

-- CreateIndex
CREATE INDEX "stock_movements_itemId_idx" ON "stock_movements"("itemId");

-- CreateIndex
CREATE INDEX "stock_movements_machineUnitId_idx" ON "stock_movements"("machineUnitId");

-- CreateIndex
CREATE INDEX "stock_movements_performedByUserId_idx" ON "stock_movements"("performedByUserId");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- CreateIndex
CREATE INDEX "shift_incharge_log_effectiveAt_idx" ON "shift_incharge_log"("effectiveAt");

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_units" ADD CONSTRAINT "machine_units_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_machineUnitId_fkey" FOREIGN KEY ("machineUnitId") REFERENCES "machine_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
