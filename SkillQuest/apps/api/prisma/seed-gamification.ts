/**
 * Gamification Seed — additive seed for the gamification module
 *
 * Extends the main `seed.ts` dataset with:
 * - 2 AiTutor rows per tenant: one tenant-default and one course-scoped
 * - Marks the final SCENARIO-type level of each course as a Boss level
 * - Bumps the demo user's rankScore into GOLD so the rank badge/ladder looks populated
 *
 * Safe to re-run: all writes are upserts / keyed updates.
 *
 * Usage:
 *   npx ts-node prisma/seed-gamification.ts
 */

import { PrismaClient, PlayerRank } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_TUTORS: ReadonlyArray<{
  name: string;
  avatar: string;
  personality: string;
  /** 当 courseId 为 undefined 时创建租户通用 Tutor */
  courseMatcher?: (course: { id: string; vendor: string }) => boolean;
}> = [
  {
    name: '青岚导师',
    avatar: '🦉',
    personality:
      '你是一位简洁、精准的云计算导师，回复控制在 80 字以内。先用一句话总结学员表现，再给出一个立刻可以做的练习建议。避免空洞鼓励，多用具体知识点。',
  },
  {
    name: '数通小师兄',
    avatar: '🛰️',
    personality:
      '你是一位华为数通方向的学长，回复控制在 80 字内，语气活泼。针对 VLAN / 路由 / STP / OSPF 等主题给出具体改进方向，可以引用 VRP 命令作为练习线索。',
    courseMatcher: (c) => c.vendor === '华为',
  },
];

/** 把 rankScore 映射到 PlayerRank (与 RankService.computeRank 一致) */
function rankFor(score: number): PlayerRank {
  if (score >= 5000) return PlayerRank.LEGEND;
  if (score >= 3000) return PlayerRank.DIAMOND;
  if (score >= 1800) return PlayerRank.PLATINUM;
  if (score >= 1000) return PlayerRank.GOLD;
  if (score >= 500) return PlayerRank.SILVER;
  if (score >= 200) return PlayerRank.BRONZE;
  return PlayerRank.IRON;
}

async function main() {
  console.log('🎮 Gamification seed 启动...\n');

  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  if (tenants.length === 0) {
    console.warn('⚠️  未找到任何租户，请先运行主 seed.ts');
    return;
  }

  for (const tenant of tenants) {
    console.log(`─── 租户: ${tenant.name} (${tenant.id}) ───`);
    const courses = await prisma.course.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, vendor: true, title: true },
    });

    // 1. AiTutor ─────────────────────────────────────────────────
    for (const tutor of TENANT_TUTORS) {
      const targetCourse = tutor.courseMatcher
        ? courses.find(tutor.courseMatcher)
        : undefined;

      const existing = await prisma.aiTutor.findFirst({
        where: {
          tenantId: tenant.id,
          name: tutor.name,
          courseId: targetCourse?.id ?? null,
        },
      });

      if (existing) {
        await prisma.aiTutor.update({
          where: { id: existing.id },
          data: {
            avatar: tutor.avatar,
            personality: tutor.personality,
          },
        });
        console.log(
          `   🤖 Tutor 已更新: ${tutor.name}${
            targetCourse ? ` → ${targetCourse.title}` : ' (租户默认)'
          }`,
        );
      } else {
        await prisma.aiTutor.create({
          data: {
            tenantId: tenant.id,
            courseId: targetCourse?.id,
            name: tutor.name,
            avatar: tutor.avatar,
            personality: tutor.personality,
          },
        });
        console.log(
          `   🤖 Tutor 已创建: ${tutor.name}${
            targetCourse ? ` → ${targetCourse.title}` : ' (租户默认)'
          }`,
        );
      }
    }

    // 2. Boss 关 ─────────────────────────────────────────────────
    for (const course of courses) {
      const bossCandidate = await prisma.level.findFirst({
        where: { courseId: course.id, type: 'SCENARIO' },
        orderBy: { sortOrder: 'desc' },
      });
      if (!bossCandidate) {
        console.log(`   👑 ${course.title}: 未找到 SCENARIO 关卡，跳过 Boss 标记`);
        continue;
      }
      await prisma.level.update({
        where: { id: bossCandidate.id },
        data: {
          isBoss: true,
          bossConfig: {
            victoryText: `恭喜击败《${course.title}》终极考验！`,
            defeatText: '败北无妨，看清 Boss 的招式后再来挑战。',
            hpPerPhase: 1000,
          },
        },
      });
      console.log(`   👑 Boss 关已标记: ${bossCandidate.title}`);
    }

    // 3. 给 tenant 下所有用户分配段位积分 (Demo 用户更高) ─────────
    const users = await prisma.user.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, email: true, totalStars: true, xp: true },
    });
    for (const u of users) {
      // 简单启发: xp/4 + stars*30，把总成绩映射到段位积分空间
      const score =
        u.email === 'demo@skillquest.dev'
          ? 1250 // 直接放到 GOLD 段
          : Math.max(0, Math.floor(u.xp / 4) + u.totalStars * 30);
      await prisma.user.update({
        where: { id: u.id },
        data: { rankScore: score, rank: rankFor(score) },
      });
    }
    console.log(`   🏆 已为 ${users.length} 位用户分配段位积分`);
  }

  console.log('\n✅ Gamification seed 完成');
}

main()
  .catch((e) => {
    console.error('❌ Gamification seed 失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
