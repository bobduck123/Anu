CREATE TABLE "public"."ScheduledJobRuns" (
  "id" TEXT NOT NULL,
  "jobName" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "result" JSONB,
  "error" TEXT,
  "lastFailedAt" TIMESTAMP(3),
  "lastFailureCode" TEXT,
  CONSTRAINT "ScheduledJobRuns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduledJobRuns_jobName_scheduledAt_key"
  ON "public"."ScheduledJobRuns"("jobName", "scheduledAt");
CREATE INDEX "ScheduledJobRuns_jobName_status_scheduledAt_idx"
  ON "public"."ScheduledJobRuns"("jobName", "status", "scheduledAt");
