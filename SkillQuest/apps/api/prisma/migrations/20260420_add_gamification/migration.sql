-- SkillQuest 游戏化改造迁移
-- 新增: PlayerRank 段位枚举, DailyQuest 每日挑战, AiTutor 导师, TeamSession 组队会话
-- 扩展: User.rankScore/rank, Level.isBoss/bossConfig

-- CreateEnum
CREATE TYPE "PlayerRank" AS ENUM ('IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGEND');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rank" "PlayerRank" NOT NULL DEFAULT 'IRON',
ADD COLUMN     "rankScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Level" ADD COLUMN     "bossConfig" JSONB,
ADD COLUMN     "isBoss" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DailyQuest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "stars" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTutor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courseId" TEXT,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '🤖',
    "personality" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "players" JSONB NOT NULL DEFAULT '[]',
    "gameState" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyQuest_tenantId_date_idx" ON "DailyQuest"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyQuest_userId_date_key" ON "DailyQuest"("userId", "date");

-- CreateIndex
CREATE INDEX "AiTutor_tenantId_idx" ON "AiTutor"("tenantId");

-- CreateIndex
CREATE INDEX "AiTutor_courseId_idx" ON "AiTutor"("courseId");

-- CreateIndex
CREATE INDEX "TeamSession_tenantId_status_idx" ON "TeamSession"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "DailyQuest" ADD CONSTRAINT "DailyQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTutor" ADD CONSTRAINT "AiTutor_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

