-- DropForeignKey
ALTER TABLE "Letter" DROP CONSTRAINT "Letter_userId_fkey";

-- AlterTable
ALTER TABLE "Letter" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
