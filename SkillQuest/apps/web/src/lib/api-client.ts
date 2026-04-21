/**
 * API Client — connects frontend to NestJS backend
 *
 * In production, all data comes from the backend API.
 * Falls back to mock data when API_URL is not configured or request fails.
 *
 * Environment: NEXT_PUBLIC_API_URL (e.g. http://localhost:3001/api)
 */

import type {
  LevelMapData,
  QuizQuestion,
  LeaderboardEntry,
  LevelBriefing,
  ScoreResult,
} from '@skillquest/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// ─── Generic fetch helper ────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  if (!API_URL) return null;

  try {
    const url = `${API_URL}${path}`;

    // Attach JWT auth header on client side
    const authHeaders: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('sq_token');
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Course APIs ─────────────────────────────────────────────────────

export interface ApiCourse {
  id: string;
  title: string;
  description: string;
  vendor: string;
  category: string;
  _count?: { levels: number };
  levels?: Array<{ id: string; title: string; type: string; sortOrder: number }>;
}

export async function fetchCourses(tenantId?: string): Promise<ApiCourse[] | null> {
  const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return apiFetch<ApiCourse[]>(`/courses${query}`);
}

export async function fetchCourse(courseId: string): Promise<ApiCourse | null> {
  return apiFetch<ApiCourse>(`/courses/${courseId}`);
}

// ─── Map Data ────────────────────────────────────────────────────────

export async function fetchMapData(courseId: string, userId?: string): Promise<LevelMapData | null> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return apiFetch<LevelMapData>(`/courses/${courseId}/map${query}`);
}

// ─── Level Questions ─────────────────────────────────────────────────

export async function fetchLevelQuestions(courseId: string): Promise<QuizQuestion[] | null> {
  return apiFetch<QuizQuestion[]>(`/courses/${courseId}/questions`);
}

// ─── Level Briefing ──────────────────────────────────────────────────

export async function fetchLevelBriefing(courseId: string, levelId: string): Promise<LevelBriefing | null> {
  return apiFetch<LevelBriefing>(`/courses/${courseId}/briefing/${levelId}`);
}

// ─── Play Content ────────────────────────────────────────────────────

export interface PlayContentResponse {
  id: string;
  type: string;
  title: string;
  content: unknown;
}

export async function fetchPlayContent(courseId: string, type: string): Promise<PlayContentResponse | null> {
  return apiFetch<PlayContentResponse>(`/courses/${courseId}/play/${type}`);
}

// ─── Leaderboard ─────────────────────────────────────────────────────

export async function fetchLeaderboard(courseId: string, limit = 20): Promise<LeaderboardEntry[] | null> {
  return apiFetch<LeaderboardEntry[]>(`/leaderboard/${courseId}?limit=${limit}`);
}

// ─── Game Results ────────────────────────────────────────────────────

export interface SubmitResultPayload {
  correctCount: number;
  totalCount: number;
  timeRemainingSec: number;
  timeLimitSec: number;
  maxCombo: number;
}

export interface SubmitResultResponse {
  score: ScoreResult;
  unlockedLevels: string[];
}

export async function submitGameResult(
  courseId: string,
  levelId: string,
  payload: SubmitResultPayload,
): Promise<SubmitResultResponse | null> {
  return apiFetch<SubmitResultResponse>(`/game/level/${courseId}/${levelId}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Analytics ───────────────────────────────────────────────────────

export async function trackEvent(
  userId: string,
  event: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  void apiFetch('/analytics/events', {
    method: 'POST',
    body: JSON.stringify({ userId, event, payload }),
  });
}

export interface UserSummary {
  totalScore: number;
  totalAttempts: number;
  progressByStatus: Record<string, number>;
  recentEvents: Array<{ event: string; createdAt: string }>;
}

export async function fetchUserSummary(userId: string): Promise<UserSummary | null> {
  return apiFetch<UserSummary>(`/analytics/users/${userId}`);
}

export interface CourseSummary {
  totalAttempts: number;
  averageScore: number;
  completionByStatus: Record<string, number>;
}

export async function fetchCourseSummary(courseId: string): Promise<CourseSummary | null> {
  return apiFetch<CourseSummary>(`/analytics/courses/${courseId}`);
}

export interface DailyActivity {
  period: string;
  since: string;
  eventCounts: Record<string, number>;
}

export async function fetchDailyActivity(days = 30): Promise<DailyActivity | null> {
  return apiFetch<DailyActivity>(`/analytics/daily?days=${days}`);
}

// ─── Narrative Content ───────────────────────────────────────────────

export interface NarrativeContent {
  channel: string;
  title: string;
  messages: Array<{
    role: string;
    avatar?: string;
    text: string;
    style?: string;
  }>;
  autoPlayDelayMs: number;
}

export async function fetchNarrativeContent(levelId: string): Promise<NarrativeContent | null> {
  return apiFetch<NarrativeContent>(`/courses/levels/${levelId}/narrative`);
}

// ─── Gamification (Rank / Daily Quest / AI Tutor / Boss) ──────────────

export type PlayerRankKey =
  | 'IRON'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'LEGEND';

export interface RankSummary {
  userId: string;
  displayName: string;
  avatarUrl: string;
  rank: PlayerRankKey;
  rankScore: number;
  nextRank: PlayerRankKey | null;
  toNext: number | null;
}

export async function fetchRank(): Promise<RankSummary | null> {
  return apiFetch<RankSummary>(`/gamification/rank`);
}

export async function fetchRankLeaderboard(limit = 50): Promise<RankSummary[] | null> {
  return apiFetch<RankSummary[]>(`/gamification/rank/leaderboard?limit=${limit}`);
}

export interface DailyQuestQuestion {
  levelId: string;
  title: string;
  courseId: string;
  courseTitle: string;
}

export interface DailyQuestRecord {
  id: string;
  userId: string;
  tenantId: string;
  date: string;
  questions: DailyQuestQuestion[];
  completed: boolean;
  completedAt: string | null;
  stars: number;
  createdAt: string;
}

export async function fetchDailyQuest(): Promise<DailyQuestRecord | null> {
  return apiFetch<DailyQuestRecord>(`/gamification/daily-quest`);
}

export async function completeDailyQuestApi(
  questId: string,
  stars: number,
): Promise<DailyQuestRecord | null> {
  return apiFetch<DailyQuestRecord>(`/gamification/daily-quest/${questId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ stars }),
  });
}

export interface TutorFeedbackRequest {
  correct: number;
  total: number;
  durationSec?: number;
  mistakes?: string[];
}

export interface TutorFeedbackResponse {
  tutorName: string;
  avatar: string;
  message: string;
  fallback: boolean;
}

export async function fetchTutorFeedback(
  levelId: string,
  payload: TutorFeedbackRequest,
): Promise<TutorFeedbackResponse | null> {
  return apiFetch<TutorFeedbackResponse>(
    `/gamification/levels/${levelId}/tutor-feedback`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export interface BossCompletePayload {
  accuracy: number;
  timeRemainingRatio?: number;
}

export interface BossCompleteResponse {
  levelId: string;
  stars: number;
  rankDelta: number;
  xpDelta: number;
  grade: 'S' | 'A' | 'B' | 'C';
  promoted: boolean;
  newRank: PlayerRankKey;
  previousRank: PlayerRankKey;
  achievementUnlocked: boolean;
}

export async function submitBossComplete(
  levelId: string,
  payload: BossCompletePayload,
): Promise<BossCompleteResponse | null> {
  return apiFetch<BossCompleteResponse>(
    `/gamification/levels/${levelId}/boss-complete`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}
