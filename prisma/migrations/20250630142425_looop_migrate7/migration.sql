/*
  Warnings:

  - You are about to drop the column `constructorCalldata` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `isDeployed` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `iv` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `recoveryToken` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `recoveryTokenExpiry` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `salt` on the `wallets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publickey]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `publickey` to the `wallets` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "wallets_constructorCalldata_key";

-- DropIndex
DROP INDEX "wallets_iv_key";

-- DropIndex
DROP INDEX "wallets_salt_key";

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "constructorCalldata",
DROP COLUMN "isDeployed",
DROP COLUMN "iv",
DROP COLUMN "recoveryToken",
DROP COLUMN "recoveryTokenExpiry",
DROP COLUMN "salt",
ADD COLUMN     "publickey" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "referral_rewards" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "reward" JSONB,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reward" JSONB,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_publickey_key" ON "wallets"("publickey");

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
