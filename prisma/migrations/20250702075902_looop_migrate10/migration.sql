/*
  Warnings:

  - You are about to drop the column `evidenceUrl` on the `artist_claims` table. All the data in the column will be lost.
  - Added the required column `artistName` to the `artist_claims` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `artist_claims` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `artist_claims` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "artist_claims" DROP COLUMN "evidenceUrl",
ADD COLUMN     "adminUserId" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "artistName" TEXT NOT NULL,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "connectionDetails" TEXT,
ADD COLUMN     "distributorInfo" JSONB,
ADD COLUMN     "evidenceUrls" TEXT[],
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "officialEmail" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "role" TEXT NOT NULL,
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "submissionType" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "websiteUrl" TEXT,
ALTER COLUMN "artistId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "artist_claims_email_idx" ON "artist_claims"("email");

-- CreateIndex
CREATE INDEX "artist_claims_artistName_idx" ON "artist_claims"("artistName");
