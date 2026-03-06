CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'SEEN');

ALTER TABLE "ChatMessage"
ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "seenAt" TIMESTAMP(3);

CREATE INDEX "ChatMessage_receiverId_status_idx" ON "ChatMessage"("receiverId", "status");
