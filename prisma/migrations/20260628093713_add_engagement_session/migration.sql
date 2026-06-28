/*
  Warnings:

  - A unique constraint covering the columns `[type,targetType,targetId,sessionId]` on the table `EngagementEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EngagementEvent" ADD COLUMN     "sessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EngagementEvent_type_targetType_targetId_sessionId_key" ON "EngagementEvent"("type", "targetType", "targetId", "sessionId");
