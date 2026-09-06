-- CreateEnum
CREATE TYPE "GenerationKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NSFW', 'CANCELED');

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" "GenerationKind" NOT NULL,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "providerRequestId" TEXT,
    "creditsUsed" INTEGER,
    "errorMessage" TEXT,
    "parentJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationOutput" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "seed" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_providerRequestId_key" ON "GenerationJob"("providerRequestId");

-- CreateIndex
CREATE INDEX "GenerationJob_workspaceId_createdAt_idx" ON "GenerationJob"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationOutput_jobId_idx" ON "GenerationOutput"("jobId");

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_parentJobId_fkey" FOREIGN KEY ("parentJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationOutput" ADD CONSTRAINT "GenerationOutput_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
