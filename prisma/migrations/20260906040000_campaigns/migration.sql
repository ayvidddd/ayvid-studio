-- CreateEnum
CREATE TYPE "CampaignPlatform" AS ENUM ('META', 'TIKTOK', 'LINKEDIN', 'GOOGLE_DISPLAY');

-- CreateEnum
CREATE TYPE "CopyKind" AS ENUM ('HEADLINE', 'CTA', 'CAPTION');

-- AlterTable
ALTER TABLE "Design" ADD COLUMN "campaignId" TEXT,
ADD COLUMN "formatLabel" TEXT;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopyVariant" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" "CampaignPlatform" NOT NULL,
    "kind" "CopyKind" NOT NULL,
    "variantLabel" TEXT NOT NULL DEFAULT 'A',
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopyVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Design_campaignId_idx" ON "Design"("campaignId");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_updatedAt_idx" ON "Campaign"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "CopyVariant_campaignId_idx" ON "CopyVariant"("campaignId");

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyVariant" ADD CONSTRAINT "CopyVariant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
