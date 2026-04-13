/**
 * CourseContext — shared course selection state across pages
 *
 * Provides current courseId via URL search params (server-component friendly).
 * Falls back to default (first course) when not specified.
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { getDefaultCourseId } from '../lib/mock-courses';

/** Read courseId from URL ?course=xxx or fall back to default */
export function useCourseId(): string {
  const searchParams = useSearchParams();
  return searchParams.get('course') ?? getDefaultCourseId();
}
