/*
  Warnings:

  - You are about to drop the `account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[password]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_userId_fkey";

-- DropForeignKey
ALTER TABLE "session" DROP CONSTRAINT "session_userId_fkey";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "DateOfBirth" TIMESTAMP(3),
ADD COLUMN     "country" TEXT,
ADD COLUMN     "password" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE "account";

-- DropTable
DROP TABLE "session";

-- CreateIndex
CREATE UNIQUE INDEX "user_password_key" ON "user"("password");
