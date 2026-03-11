-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('TOTAL', 'PER_PERSON');

-- AlterTable
ALTER TABLE "Job"
  ADD COLUMN "budgetType" "BudgetType" NOT NULL DEFAULT 'TOTAL';
