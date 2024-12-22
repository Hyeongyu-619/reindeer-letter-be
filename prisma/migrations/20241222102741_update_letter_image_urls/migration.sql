/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Letter` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Letter" DROP COLUMN "imageUrl",
ADD COLUMN     "imageUrls" TEXT[];
