/*
  Warnings:

  - The primary key for the `wallets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `starknet` on the `wallets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[address]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[encryptedPrivateKey]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[iv]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[salt]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address` to the `wallets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_pkey",
DROP COLUMN "id",
DROP COLUMN "starknet",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "encryptedPrivateKey" TEXT,
ADD COLUMN     "iv" TEXT,
ADD COLUMN     "salt" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "wallets_address_key" ON "wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_encryptedPrivateKey_key" ON "wallets"("encryptedPrivateKey");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_iv_key" ON "wallets"("iv");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_salt_key" ON "wallets"("salt");
