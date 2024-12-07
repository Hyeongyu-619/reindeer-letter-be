-- AlterTable
ALTER TABLE "Letter" ADD COLUMN     "receiverId" INTEGER;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
