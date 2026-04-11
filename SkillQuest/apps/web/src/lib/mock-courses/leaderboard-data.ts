/**
 * Leaderboard mock data per course — multi-vendor
 */

import type { LeaderboardEntry } from '@skillquest/types';

const LEADERBOARDS: Record<string, LeaderboardEntry[]> = {
  'huawei-hcia-datacom': [
    { userId: 'u1', displayName: '王磊', avatarUrl: '', totalScore: 12500, rank: 1, rankChange: 0, stars: 24, streakDays: 15 },
    { userId: 'u2', displayName: '李明', avatarUrl: '', totalScore: 11800, rank: 2, rankChange: 1, stars: 22, streakDays: 12 },
    { userId: 'u3', displayName: '张三', avatarUrl: '', totalScore: 11200, rank: 3, rankChange: -1, stars: 21, streakDays: 10 },
    { userId: 'u4', displayName: '赵燕', avatarUrl: '', totalScore: 9800, rank: 4, rankChange: 2, stars: 18, streakDays: 8 },
    { userId: 'u5', displayName: '周伟 (你)', avatarUrl: '', totalScore: 9500, rank: 5, rankChange: 3, stars: 16, streakDays: 7 },
    { userId: 'u6', displayName: '孙涛', avatarUrl: '', totalScore: 8900, rank: 6, rankChange: -2, stars: 15, streakDays: 5 },
    { userId: 'u7', displayName: '吴芳', avatarUrl: '', totalScore: 8200, rank: 7, rankChange: 0, stars: 14, streakDays: 4 },
    { userId: 'u8', displayName: '陈刚', avatarUrl: '', totalScore: 7500, rank: 8, rankChange: -1, stars: 12, streakDays: 3 },
  ],
  'sangfor-hci': [
    { userId: 'u1', displayName: '刘洋', avatarUrl: '', totalScore: 10800, rank: 1, rankChange: 0, stars: 20, streakDays: 12 },
    { userId: 'u2', displayName: '张伟', avatarUrl: '', totalScore: 9900, rank: 2, rankChange: 2, stars: 18, streakDays: 9 },
    { userId: 'u3', displayName: '周伟 (你)', avatarUrl: '', totalScore: 9200, rank: 3, rankChange: 1, stars: 16, streakDays: 8 },
    { userId: 'u4', displayName: '黄丽', avatarUrl: '', totalScore: 8500, rank: 4, rankChange: -2, stars: 14, streakDays: 6 },
    { userId: 'u5', displayName: '林峰', avatarUrl: '', totalScore: 7800, rank: 5, rankChange: 0, stars: 12, streakDays: 5 },
    { userId: 'u6', displayName: '何静', avatarUrl: '', totalScore: 7100, rank: 6, rankChange: 1, stars: 10, streakDays: 3 },
  ],
  'anchao-cloud': [
    { userId: 'u1', displayName: '陈志', avatarUrl: '', totalScore: 8500, rank: 1, rankChange: 0, stars: 16, streakDays: 10 },
    { userId: 'u2', displayName: '周伟 (你)', avatarUrl: '', totalScore: 7800, rank: 2, rankChange: 1, stars: 14, streakDays: 7 },
    { userId: 'u3', displayName: '杨帆', avatarUrl: '', totalScore: 7200, rank: 3, rankChange: -1, stars: 12, streakDays: 6 },
    { userId: 'u4', displayName: '徐亮', avatarUrl: '', totalScore: 6500, rank: 4, rankChange: 0, stars: 10, streakDays: 4 },
    { userId: 'u5', displayName: '马蓉', avatarUrl: '', totalScore: 5900, rank: 5, rankChange: 2, stars: 8, streakDays: 3 },
  ],
};

/** Determine current user ID per course */
const CURRENT_USER: Record<string, string> = {
  'huawei-hcia-datacom': 'u5',
  'sangfor-hci': 'u3',
  'anchao-cloud': 'u2',
};

export function getLeaderboard(courseId: string): { entries: LeaderboardEntry[]; currentUserId: string } {
  return {
    entries: LEADERBOARDS[courseId] ?? LEADERBOARDS['huawei-hcia-datacom']!,
    currentUserId: CURRENT_USER[courseId] ?? 'u5',
  };
}
