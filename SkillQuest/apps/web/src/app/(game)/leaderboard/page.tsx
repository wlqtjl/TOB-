/**
 * 实时排行榜 — 对标 Data Center 资源/收益可视化
 */

import type { LeaderboardEntry } from '@skillquest/types';

const mockLeaderboard: LeaderboardEntry[] = [
  { userId: 'u1', displayName: '王磊', avatarUrl: '', totalScore: 12500, rank: 1, rankChange: 0, stars: 24, streakDays: 15 },
  { userId: 'u2', displayName: '李明', avatarUrl: '', totalScore: 11800, rank: 2, rankChange: 1, stars: 22, streakDays: 12 },
  { userId: 'u3', displayName: '张三', avatarUrl: '', totalScore: 11200, rank: 3, rankChange: -1, stars: 21, streakDays: 10 },
  { userId: 'u4', displayName: '赵燕', avatarUrl: '', totalScore: 9800, rank: 4, rankChange: 2, stars: 18, streakDays: 8 },
  { userId: 'u5', displayName: '周伟 (你)', avatarUrl: '', totalScore: 9500, rank: 5, rankChange: 3, stars: 16, streakDays: 7 },
  { userId: 'u6', displayName: '孙涛', avatarUrl: '', totalScore: 8900, rank: 6, rankChange: -2, stars: 15, streakDays: 5 },
  { userId: 'u7', displayName: '吴芳', avatarUrl: '', totalScore: 8200, rank: 7, rankChange: 0, stars: 14, streakDays: 4 },
  { userId: 'u8', displayName: '陈刚', avatarUrl: '', totalScore: 7500, rank: 8, rankChange: -1, stars: 12, streakDays: 3 },
];

const CROWN_ICONS = ['👑', '🥈', '🥉'];

function RankChangeIndicator({ change }: { change: number }) {
  if (change > 0) return <span className="text-green-400 text-xs font-mono">↑{change}</span>;
  if (change < 0) return <span className="text-red-400 text-xs font-mono">↓{Math.abs(change)}</span>;
  return <span className="text-gray-600 text-xs">—</span>;
}

function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const isTopThree = entry.rank <= 3;

  return (
    <div
      className={`
        flex items-center gap-4 rounded-xl border p-4 transition-all
        ${isCurrentUser
          ? 'border-blue-500/50 bg-blue-900/20'
          : isTopThree
            ? 'border-yellow-400/20 bg-yellow-950/10'
            : 'border-gray-800 bg-gray-900/30'
        }
      `}
    >
      <div className="flex w-10 items-center justify-center text-lg font-bold">
        {isTopThree ? CROWN_ICONS[entry.rank - 1] : (
          <span className="text-gray-500">{entry.rank}</span>
        )}
      </div>

      <div className={`
        h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold
        ${isCurrentUser ? 'bg-blue-600' : 'bg-gray-700'}
      `}>
        {entry.displayName[0]}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isCurrentUser ? 'text-blue-300' : 'text-gray-200'}`}>
            {entry.displayName}
          </span>
          <RankChangeIndicator change={entry.rankChange} />
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span>⭐ {entry.stars} 星</span>
          <span>🔥 连续 {entry.streakDays} 天</span>
        </div>
      </div>

      <div className="text-right">
        <div className={`text-lg font-bold font-mono ${isTopThree ? 'text-yellow-400' : 'text-gray-300'}`}>
          {entry.totalScore.toLocaleString()}
        </div>
        <div className="text-xs text-gray-600">分</div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-yellow-400">🏆 实时排行榜</h1>
            <p className="text-sm text-gray-500">华为 HCIA-Datacom · 全部学员 · 本周</p>
          </div>
          <div className="flex gap-2">
            {['本周', '本月', '赛季', '全部'].map((period) => (
              <button
                key={period}
                className={`rounded-lg px-3 py-1 text-xs ${
                  period === '本周'
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {mockLeaderboard.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              isCurrentUser={entry.userId === 'u5'}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
          <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          实时更新中 (WebSocket + Redis Sorted Set)
        </div>
      </div>
    </div>
  );
}
