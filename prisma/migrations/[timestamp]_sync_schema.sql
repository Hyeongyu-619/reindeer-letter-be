-- 기존 컬럼 이름 변경
ALTER TABLE "Letter" RENAME COLUMN "senderNickName" TO "senderNickname";
ALTER TABLE "Letter" RENAME COLUMN "userId" TO "senderId";

-- 임시저장 관련 컬럼 추가
ALTER TABLE "Letter" ADD COLUMN IF NOT EXISTS "isDraft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Letter" ADD COLUMN IF NOT EXISTS "draftData" JSONB; 