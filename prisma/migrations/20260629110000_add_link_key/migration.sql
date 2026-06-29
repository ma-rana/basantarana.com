-- AlterTable
-- Optional named key for a link (e.g. "github") -> {{ profile.link_github }}.
ALTER TABLE "LinkAsset" ADD COLUMN     "key" TEXT;

-- CreateIndex
CREATE INDEX "LinkAsset_key_idx" ON "LinkAsset"("key");
