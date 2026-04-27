-- AlterTable: add soft-delete and profile fields to User
ALTER TABLE "User" ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- CreateIndex
CREATE INDEX "User_deleted_idx" ON "User"("deleted");
