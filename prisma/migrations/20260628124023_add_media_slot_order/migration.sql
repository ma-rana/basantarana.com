-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "slotOrder" INTEGER;

-- CreateIndex
CREATE INDEX "MediaAsset_type_slotOrder_idx" ON "MediaAsset"("type", "slotOrder");
