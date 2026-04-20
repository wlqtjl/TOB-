/**
 * Sprint Mode Page — 5-minute quick quiz
 *
 * Route: /sprint?course={courseId}
 * Duolingo-style ultra-short learning cycles.
 */

'use client';

import React, { Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SprintMode, { DEMO_SPRINT_QUESTIONS } from '../../components/game/SprintMode';
import { useCourseId } from '../../hooks/useCourseId';
import { getCourse } from '../../lib/mock-courses';

function SprintContent() {
  const courseId = useCourseId();
  const course = getCourse(courseId);
  const router = useRouter();

  const handleComplete = useCallback(() => {
    // In production: POST sprint results to API
  }, []);

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  return (
    <SprintMode
      questions={DEMO_SPRINT_QUESTIONS}
      courseTitle={course?.title ?? '快速冲刺'}
      durationSec={300}
      onComplete={handleComplete}
      onBack={handleBack}
    />
  );
}

export default function SprintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <p className="text-gray-500 animate-pulse">准备冲刺模式...</p>
        </div>
      }
    >
      <SprintContent />
    </Suspense>
  );
}
