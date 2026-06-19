-- Notes, rappels et lien Google Calendar sur les actions
ALTER TABLE "Action" ADD COLUMN "notes" TEXT;
ALTER TABLE "Action" ADD COLUMN "remindBeforeMinutes" INTEGER;
ALTER TABLE "Action" ADD COLUMN "remindAt" TIMESTAMP(3);
ALTER TABLE "Action" ADD COLUMN "remindSentAt" TIMESTAMP(3);
ALTER TABLE "Action" ADD COLUMN "googleCalendarEventId" TEXT;

CREATE INDEX "Action_remindAt_idx" ON "Action"("remindAt");
