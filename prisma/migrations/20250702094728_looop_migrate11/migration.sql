-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "AdminLevel" AS ENUM ('MODERATOR', 'ADMIN', 'SUPER_ADMIN');

-- DropIndex
DROP INDEX "user_password_key";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "adminApprovedAt" TIMESTAMP(3),
ADD COLUMN     "adminApprovedBy" TEXT,
ADD COLUMN     "adminLevel" "AdminLevel",
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ALTER COLUMN "password" DROP DEFAULT;
