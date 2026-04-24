-- AlterTable
ALTER TABLE "users"."UserRole" ADD COLUMN     "auto_assigned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "notifications"."InAppNotification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_type_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "event_source" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InAppNotification_user_id_read_idx" ON "notifications"."InAppNotification"("user_id", "read");

-- CreateIndex
CREATE INDEX "InAppNotification_user_id_created_at_idx" ON "notifications"."InAppNotification"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "notifications"."InAppNotification" ADD CONSTRAINT "InAppNotification_notification_type_id_fkey" FOREIGN KEY ("notification_type_id") REFERENCES "notifications"."NotificationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
