-- AlterEnum
-- Add FAVICON to MediaType so a site favicon can be managed like other media
-- (single-active, dedicated type). Postgres allows adding enum values directly.
ALTER TYPE "MediaType" ADD VALUE 'FAVICON';
