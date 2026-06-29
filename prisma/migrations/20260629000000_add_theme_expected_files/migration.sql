-- AlterTable
-- Per-theme "expected files" checklist: [{ name, label }], JSONB. Default empty
-- array so existing rows are valid without a backfill.
ALTER TABLE "Theme" ADD COLUMN     "expectedFiles" JSONB NOT NULL DEFAULT '[]';
