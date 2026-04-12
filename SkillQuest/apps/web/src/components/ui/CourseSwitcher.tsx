/**
 * CourseSwitcher — minimal floating course selector
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
          className={`rounded-lg px-3 py-1.5 text-xs transition ${
            c.id === currentCourseId
              ? 'bg-accent/10 text-accent border border-accent/30'
              : 'text-base-400 border border-base-600/30 hover:border-base-500 hover:text-base-200'
          }`}
        >
          {c.title}
        </a>
      ))}
    </div>
  );
}
