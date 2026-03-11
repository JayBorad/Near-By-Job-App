-- CreateTable
CREATE TABLE "Review" (
  "id" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "reviewerId" UUID NOT NULL,
  "revieweeId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);

-- CreateIndex
CREATE INDEX "Review_jobId_idx" ON "Review"("jobId");
CREATE INDEX "Review_reviewerId_idx" ON "Review"("reviewerId");
CREATE INDEX "Review_revieweeId_idx" ON "Review"("revieweeId");
CREATE UNIQUE INDEX "Review_jobId_reviewerId_revieweeId_key" ON "Review"("jobId", "reviewerId", "revieweeId");

-- AddForeignKey
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_revieweeId_fkey"
  FOREIGN KEY ("revieweeId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
