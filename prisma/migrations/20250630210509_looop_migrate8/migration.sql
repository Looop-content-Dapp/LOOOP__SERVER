-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "settings" JSONB NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "evidenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artist_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_analytics_daily" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "playCount" INTEGER NOT NULL,
    "followerCount" INTEGER NOT NULL,

    CONSTRAINT "artist_analytics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "user_preferences_userId_idx" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "artist_claims_userId_idx" ON "artist_claims"("userId");

-- CreateIndex
CREATE INDEX "artist_claims_artistId_idx" ON "artist_claims"("artistId");

-- CreateIndex
CREATE INDEX "artist_claims_status_idx" ON "artist_claims"("status");

-- CreateIndex
CREATE INDEX "artist_analytics_daily_artistId_idx" ON "artist_analytics_daily"("artistId");

-- CreateIndex
CREATE INDEX "artist_analytics_daily_date_idx" ON "artist_analytics_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "artist_analytics_daily_artistId_date_key" ON "artist_analytics_daily"("artistId", "date");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_claims" ADD CONSTRAINT "artist_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_claims" ADD CONSTRAINT "artist_claims_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_analytics_daily" ADD CONSTRAINT "artist_analytics_daily_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
