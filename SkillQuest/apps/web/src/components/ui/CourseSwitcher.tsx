/**
 * CourseSwitcher — floating course selector shown on game pages
 *
 * Allows switching between vendor courses via URL param ?course=xxx
 */

'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import { COURSES, getDefaultCourseId } from '../../lib/mock-courses';

export default function CourseSwitcher() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentCourseId = searchParams.get('course') ?? getDefaultCourseId();

  function buildHref(courseId: string): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set('course', courseId);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {COURSES.map((c) => (
        <a
          key={c.id}
          href={buildHref(c.id)}
          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
            c.id === currentCourseId
              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
              : 'border-gray-700 text-gray-500 hover:border-gray-500'
          }`}
        >
          {c.icon} {c.title}
        </a>
      ))}
    </div>
  );
}
