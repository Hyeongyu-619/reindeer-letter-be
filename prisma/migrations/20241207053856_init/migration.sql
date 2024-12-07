/*
  Warnings:

  - Made the column `receiverId` on table `Letter` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Letter" DROP CONSTRAINT "Letter_receiverId_fkey";

-- AlterTable
ALTER TABLE "Letter" ALTER COLUMN "receiverId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
