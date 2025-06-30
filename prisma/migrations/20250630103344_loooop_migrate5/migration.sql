/*
  Warnings:

  - A unique constraint covering the columns `[constructorCalldata]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "constructorCalldata" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "wallets_constructorCalldata_key" ON "wallets"("constructorCalldata");
