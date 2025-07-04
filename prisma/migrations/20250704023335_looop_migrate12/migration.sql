/*
  Warnings:

  - You are about to drop the column `genres` on the `artists` table. All the data in the column will be lost.
  - Made the column `totalSupply` on table `nft_collections` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'APPLE', 'EMAIL');

-- AlterTable
ALTER TABLE "artists" DROP COLUMN "genres";

-- AlterTable
ALTER TABLE "nft_collections" ALTER COLUMN "totalSupply" SET NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "authProvider" "AuthProvider";

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_genres" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "artist_genres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "genres_id_idx" ON "genres"("id");

-- CreateIndex
CREATE INDEX "genres_name_idx" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE INDEX "artist_genres_artistId_idx" ON "artist_genres"("artistId");

-- CreateIndex
CREATE INDEX "artist_genres_genreId_idx" ON "artist_genres"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "artist_genres_artistId_genreId_key" ON "artist_genres"("artistId", "genreId");

-- AddForeignKey
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
