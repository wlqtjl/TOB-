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
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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
