-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Design_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignVersion" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "layers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Design_workspaceId_updatedAt_idx" ON "Design"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DesignVersion_designId_sequence_key" ON "DesignVersion"("designId", "sequence");

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignVersion" ADD CONSTRAINT "DesignVersion_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;
