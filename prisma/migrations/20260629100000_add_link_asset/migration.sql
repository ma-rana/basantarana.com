-- CreateTable
-- External links (social profiles, external sites). Same activate/slot pattern
-- as MediaAsset, but link-only: a url + a label, no stored file.
CREATE TABLE "LinkAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "slotOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkAsset_isActive_idx" ON "LinkAsset"("isActive");

-- CreateIndex
CREATE INDEX "LinkAsset_slotOrder_idx" ON "LinkAsset"("slotOrder");
