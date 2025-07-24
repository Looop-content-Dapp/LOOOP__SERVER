/*
  Warnings:

  - You are about to drop the column `albumId` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the `albums` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "albums" DROP CONSTRAINT "albums_artistId_fkey";

-- DropForeignKey
ALTER TABLE "tracks" DROP CONSTRAINT "tracks_albumId_fkey";

-- AlterTable
ALTER TABLE "tracks" DROP COLUMN "albumId";

-- DropTable
DROP TABLE "albums";
