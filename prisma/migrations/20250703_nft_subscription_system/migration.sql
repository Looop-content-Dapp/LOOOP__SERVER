-- Create NFT Subscription System Tables

-- NFT Collections for communities (each community has its own NFT collection)
CREATE TABLE "nft_collections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT,
    "communityId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "contractAddress" TEXT UNIQUE,
    "totalSupply" INTEGER DEFAULT 0,
    "maxSupply" INTEGER,
    "pricePerMonth" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "imageUrl" TEXT,
    "metadataUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nft_collections_pkey" PRIMARY KEY ("id")
);

-- User NFT memberships (tracks NFT ownership and expiration)
CREATE TABLE "nft_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "mintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nft_memberships_pkey" PRIMARY KEY ("id")
);

-- Transaction history for all blockchain transactions
CREATE TABLE "transaction_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" TEXT,
    "type" TEXT NOT NULL, -- 'mint', 'create_collection', 'transfer', 'payment'
    "transactionHash" TEXT NOT NULL,
    "contractAddress" TEXT,
    "tokenId" TEXT,
    "amount" DECIMAL(65,30),
    "currency" TEXT,
    "status" TEXT NOT NULL, -- 'pending', 'success', 'failed'
    "blockNumber" INTEGER,
    "gasUsed" TEXT,
    "gasFee" DECIMAL(65,30),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_history_pkey" PRIMARY KEY ("id")
);

-- Subscription earnings analytics for artists
CREATE TABLE "subscription_analytics" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "newSubscribers" INTEGER NOT NULL DEFAULT 0,
    "renewedSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "expiredSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "cancelledSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "totalActiveSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_analytics_pkey" PRIMARY KEY ("id")
);

-- Cron job execution logs
CREATE TABLE "cron_job_logs" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL, -- 'running', 'success', 'failed'
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER, -- in milliseconds
    "processedItems" INTEGER DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cron_job_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better performance
CREATE INDEX "nft_collections_communityId_idx" ON "nft_collections"("communityId");
CREATE INDEX "nft_collections_artistId_idx" ON "nft_collections"("artistId");
CREATE INDEX "nft_collections_contractAddress_idx" ON "nft_collections"("contractAddress");

CREATE INDEX "nft_memberships_userId_idx" ON "nft_memberships"("userId");
CREATE INDEX "nft_memberships_communityId_idx" ON "nft_memberships"("communityId");
CREATE INDEX "nft_memberships_collectionId_idx" ON "nft_memberships"("collectionId");
CREATE INDEX "nft_memberships_tokenId_idx" ON "nft_memberships"("tokenId");
CREATE INDEX "nft_memberships_expiresAt_idx" ON "nft_memberships"("expiresAt");
CREATE INDEX "nft_memberships_isActive_idx" ON "nft_memberships"("isActive");

CREATE INDEX "transaction_history_userId_idx" ON "transaction_history"("userId");
CREATE INDEX "transaction_history_artistId_idx" ON "transaction_history"("artistId");
CREATE INDEX "transaction_history_type_idx" ON "transaction_history"("type");
CREATE INDEX "transaction_history_status_idx" ON "transaction_history"("status");
CREATE INDEX "transaction_history_transactionHash_idx" ON "transaction_history"("transactionHash");
CREATE INDEX "transaction_history_createdAt_idx" ON "transaction_history"("createdAt");

CREATE INDEX "subscription_analytics_artistId_idx" ON "subscription_analytics"("artistId");
CREATE INDEX "subscription_analytics_communityId_idx" ON "subscription_analytics"("communityId");
CREATE INDEX "subscription_analytics_date_idx" ON "subscription_analytics"("date");

CREATE INDEX "cron_job_logs_jobName_idx" ON "cron_job_logs"("jobName");
CREATE INDEX "cron_job_logs_status_idx" ON "cron_job_logs"("status");
CREATE INDEX "cron_job_logs_startedAt_idx" ON "cron_job_logs"("startedAt");

-- Add unique constraints
CREATE UNIQUE INDEX "nft_memberships_tokenId_contractAddress_key" ON "nft_memberships"("tokenId", "contractAddress");
CREATE UNIQUE INDEX "subscription_analytics_artistId_communityId_date_key" ON "subscription_analytics"("artistId", "communityId", "date");

-- Add foreign key constraints
ALTER TABLE "nft_collections" ADD CONSTRAINT "nft_collections_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nft_collections" ADD CONSTRAINT "nft_collections_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nft_memberships" ADD CONSTRAINT "nft_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nft_memberships" ADD CONSTRAINT "nft_memberships_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nft_memberships" ADD CONSTRAINT "nft_memberships_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "nft_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_history" ADD CONSTRAINT "transaction_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transaction_history" ADD CONSTRAINT "transaction_history_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscription_analytics" ADD CONSTRAINT "subscription_analytics_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_analytics" ADD CONSTRAINT "subscription_analytics_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_analytics" ADD CONSTRAINT "subscription_analytics_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "nft_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
