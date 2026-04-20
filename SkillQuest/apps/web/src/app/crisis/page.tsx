/**
 * Crisis Simulator Page — Data Center Crisis Entry Point
 *
 * Route: /crisis?course={courseId}
 * Immersive narrative entry: player becomes a rescue engineer
 * responding to a critical data center failure.
 */

'use client';

import React, { Suspense, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StoryIntroPage from '../../components/game/StoryIntroPage';
import LeaderboardToast from '../../components/game/LeaderboardToast';
import { useCourseId } from '../../hooks/useCourseId';
import { getCourse } from '../../lib/mock-courses';

function CrisisContent() {
  const courseId = useCourseId();
  const course = getCourse(courseId);
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  const handleAccept = useCallback(() => {
    setAccepted(true);
    // Navigate to the map (mission control) after brief delay
    setTimeout(() => {
      router.push(`/map?course=${courseId}`);
    }, 500);
  }, [router, courseId]);

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <p className="text-emerald-400 text-sm font-mono">正在接入数据中心...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StoryIntroPage
        courseTitle={course?.title ?? '数据中心救援'}
        missionCount={course?.levelCount ?? 8}
        onAccept={handleAccept}
        crisisMessage="核心服务离线 — 影响 50,000 用户"
      />
      <LeaderboardToast enabled={true} intervalMs={12000} />
    </>
  );
}

export default function CrisisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <p className="text-red-400 animate-pulse font-mono">⚠ 加载危机模拟器...</p>
        </div>
      }
    >
      <CrisisContent />
    </Suspense>
  );
}
