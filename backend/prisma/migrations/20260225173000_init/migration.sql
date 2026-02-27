CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DELETED');
CREATE TYPE "CategoryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "JobType" AS ENUM ('ONE_TIME', 'PART_TIME', 'FULL_TIME');
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supabaseAuthId" UUID NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT NOT NULL,
  "avatar" TEXT,
  "bio" TEXT,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Category" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "status" "CategoryStatus" NOT NULL DEFAULT 'PENDING',
  "createdBy" UUID NOT NULL,
  "approvedBy" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Category_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Job" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "categoryId" UUID NOT NULL,
  "budget" DECIMAL(12,2) NOT NULL,
  "jobType" "JobType" NOT NULL,
  "latitude" DECIMAL(9,6) NOT NULL,
  "longitude" DECIMAL(9,6) NOT NULL,
  "address" TEXT NOT NULL,
  "location" geography(Point, 4326),
  "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
  "dueDate" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Job_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Job_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "JobApplication" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" UUID NOT NULL,
  "applicantId" UUID NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "JobApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ChatMessage" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" UUID NOT NULL,
  "senderId" UUID NOT NULL,
  "receiverId" UUID NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ChatMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "JobApplication_jobId_applicantId_key" ON "JobApplication"("jobId", "applicantId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "Category_status_idx" ON "Category"("status");
CREATE INDEX "Category_createdBy_idx" ON "Category"("createdBy");
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE INDEX "Job_categoryId_idx" ON "Job"("categoryId");
CREATE INDEX "Job_createdBy_idx" ON "Job"("createdBy");
CREATE INDEX "Job_deletedAt_idx" ON "Job"("deletedAt");
CREATE INDEX "Job_dueDate_idx" ON "Job"("dueDate");
CREATE INDEX "Job_location_gix" ON "Job" USING GIST ("location");
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");
CREATE INDEX "JobApplication_applicantId_idx" ON "JobApplication"("applicantId");
CREATE INDEX "ChatMessage_jobId_createdAt_idx" ON "ChatMessage"("jobId", "createdAt");
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");
CREATE INDEX "ChatMessage_receiverId_idx" ON "ChatMessage"("receiverId");

CREATE OR REPLACE FUNCTION set_job_location() RETURNS trigger AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326)::geography;
  NEW.updatedAt := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_job_set_location
BEFORE INSERT OR UPDATE OF latitude, longitude
ON "Job"
FOR EACH ROW
EXECUTE FUNCTION set_job_location();
