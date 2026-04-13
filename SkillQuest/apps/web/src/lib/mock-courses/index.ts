/**
 * Mock Course Data Layer — Single-Tenant B2B Demo
 *
 * Centralizes all mock data so pages are data-agnostic.
 * Demo: SmartX as the deploying tenant with 4 product courses
 *
 * In production this is replaced by API calls to the NestJS backend.
 * Each deploying company creates their own courses via document import.
 */

export { COURSES, getCourse, getCourseIds, getDefaultCourseId } from './courses';
export { getMapData } from './map-data';
export { getLevelQuestions } from './level-questions';
export { getLeaderboard } from './leaderboard-data';
export { getPlayContent, getPlayContentTypes } from './play-content';
export { getLevelBriefing, getCourseBriefings } from './briefing-data';
export type { CourseInfo } from './courses';
