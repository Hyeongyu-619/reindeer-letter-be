-- AlterTable
ALTER TABLE "Letter" ADD COLUMN     "audioUrl" TEXT,
ALTER COLUMN "description" DROP NOT NULL;
