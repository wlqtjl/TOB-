/**
 * Leaderboard mock data per course — single-tenant B2B (SmartX demo)
 */

import type { LeaderboardEntry } from '@skillquest/types';

const LEADERBOARDS: Record<string, LeaderboardEntry[]> = {
  'smartx-halo': [
    { userId: 'u1', displayName: '周伟 (你)', avatarUrl: '', totalScore: 13200, rank: 1, rankChange: 2, stars: 22, streakDays: 18 },
    { userId: 'u2', displayName: '谢天华', avatarUrl: '', totalScore: 12800, rank: 2, rankChange: -1, stars: 20, streakDays: 14 },
    { userId: 'u3', displayName: '方晓', avatarUrl: '', totalScore: 11500, rank: 3, rankChange: 0, stars: 18, streakDays: 11 },
    { userId: 'u4', displayName: '韩磊', avatarUrl: '', totalScore: 10200, rank: 4, rankChange: 1, stars: 16, streakDays: 9 },
    { userId: 'u5', displayName: '钱进', avatarUrl: '', totalScore: 9800, rank: 5, rankChange: -2, stars: 14, streakDays: 7 },
    { userId: 'u6', displayName: '段誉', avatarUrl: '', totalScore: 8900, rank: 6, rankChange: 0, stars: 12, streakDays: 5 },
    { userId: 'u7', displayName: '萧峰', avatarUrl: '', totalScore: 8100, rank: 7, rankChange: 1, stars: 10, streakDays: 4 },
  ],
  'smartx-migration': [
    { userId: 'u1', displayName: '方晓', avatarUrl: '', totalScore: 9200, rank: 1, rankChange: 0, stars: 16, streakDays: 12 },
    { userId: 'u2', displayName: '周伟 (你)', avatarUrl: '', totalScore: 8800, rank: 2, rankChange: 1, stars: 14, streakDays: 9 },
    { userId: 'u3', displayName: '韩磊', avatarUrl: '', totalScore: 8100, rank: 3, rankChange: -1, stars: 12, streakDays: 7 },
    { userId: 'u4', displayName: '谢天华', avatarUrl: '', totalScore: 7500, rank: 4, rankChange: 0, stars: 10, streakDays: 5 },
    { userId: 'u5', displayName: '段誉', avatarUrl: '', totalScore: 6800, rank: 5, rankChange: 2, stars: 8, streakDays: 4 },
    { userId: 'u6', displayName: '萧峰', avatarUrl: '', totalScore: 6200, rank: 6, rankChange: -1, stars: 6, streakDays: 3 },
  ],
  'smartx-zbs': [
    { userId: 'u1', displayName: '谢天华', avatarUrl: '', totalScore: 11800, rank: 1, rankChange: 0, stars: 20, streakDays: 15 },
    { userId: 'u2', displayName: '韩磊', avatarUrl: '', totalScore: 11200, rank: 2, rankChange: 1, stars: 18, streakDays: 12 },
    { userId: 'u3', displayName: '周伟 (你)', avatarUrl: '', totalScore: 10500, rank: 3, rankChange: 1, stars: 16, streakDays: 10 },
    { userId: 'u4', displayName: '方晓', avatarUrl: '', totalScore: 9800, rank: 4, rankChange: -2, stars: 14, streakDays: 8 },
    { userId: 'u5', displayName: '钱进', avatarUrl: '', totalScore: 9100, rank: 5, rankChange: 0, stars: 12, streakDays: 6 },
    { userId: 'u6', displayName: '段誉', avatarUrl: '', totalScore: 8400, rank: 6, rankChange: 1, stars: 10, streakDays: 4 },
    { userId: 'u7', displayName: '萧峰', avatarUrl: '', totalScore: 7700, rank: 7, rankChange: 0, stars: 8, streakDays: 3 },
  ],
  'smartx-cloudtower': [
    { userId: 'u1', displayName: '韩磊', avatarUrl: '', totalScore: 7800, rank: 1, rankChange: 0, stars: 14, streakDays: 10 },
    { userId: 'u2', displayName: '周伟 (你)', avatarUrl: '', totalScore: 7200, rank: 2, rankChange: 2, stars: 12, streakDays: 7 },
    { userId: 'u3', displayName: '谢天华', avatarUrl: '', totalScore: 6500, rank: 3, rankChange: -1, stars: 10, streakDays: 5 },
    { userId: 'u4', displayName: '方晓', avatarUrl: '', totalScore: 5900, rank: 4, rankChange: -1, stars: 8, streakDays: 4 },
    { userId: 'u5', displayName: '钱进', avatarUrl: '', totalScore: 5200, rank: 5, rankChange: 0, stars: 6, streakDays: 3 },
  ],
};

/** Determine current user ID per course */
const CURRENT_USER: Record<string, string> = {
  'smartx-halo': 'u1',
  'smartx-migration': 'u2',
  'smartx-zbs': 'u3',
  'smartx-cloudtower': 'u2',
};

export function getLeaderboard(courseId: string): { entries: LeaderboardEntry[]; currentUserId: string } {
  return {
    entries: LEADERBOARDS[courseId] ?? LEADERBOARDS['smartx-halo']!,
    currentUserId: CURRENT_USER[courseId] ?? 'u1',
  };
}
