-- DropForeignKey
ALTER TABLE "tracks" DROP CONSTRAINT "tracks_userId_fkey";

-- AlterTable
ALTER TABLE "tracks" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
