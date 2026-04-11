/**
 * Mock Course Data Layer — Multi-Vendor Demo
 *
 * Centralizes all mock data so pages are data-agnostic.
 * Supports: 华为 HCIA · 深信服超融合 · 安超云
 *
 * In production this is replaced by API calls to the NestJS backend.
 */

export { COURSES, getCourse, getCourseIds, getDefaultCourseId } from './courses';
export { getMapData } from './map-data';
export { getLevelQuestions } from './level-questions';
export { getLeaderboard } from './leaderboard-data';
export { getPlayContent, getPlayContentTypes } from './play-content';
export type { CourseInfo } from './courses';
