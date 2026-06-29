-- AlterTable
-- Optional live-stat fields. apiUrl/apiPath configure a fetch; cachedValue/
-- fetchedAt hold the last successful result. All nullable: existing manual
-- stats are unaffected (apiUrl stays NULL -> manual `value` is used).
ALTER TABLE "PlatformStat" ADD COLUMN     "apiUrl" TEXT,
ADD COLUMN     "apiPath" TEXT,
ADD COLUMN     "cachedValue" INTEGER,
ADD COLUMN     "fetchedAt" TIMESTAMP(3);
