'use client';

/**
 * ProtectedRoute — client-side auth guard
 *
 * Wrap page content that requires authentication.
 * Redirects to /login if not authenticated, shows spinner while loading.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Optional: restrict to specific roles */
  allowedRoles?: Array<'ADMIN' | 'TRAINER' | 'LEARNER'>;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2
          size={28}
          strokeWidth={1.5}
          className="animate-spin text-accent"
        />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
