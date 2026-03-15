"use client";

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthGateCard from '@/components/auth/AuthGateCard';
import TeamsView from '@/components/teams/TeamsView';

export default function TeamsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading teams...</div>;
  }

  if (!isAuthenticated) {
    return (
      <AuthGateCard
        eyebrow="Teams"
        title="Sign in to form or join teams"
        description="Team membership, collective challenges, and shared action tracking are scoped to signed-in participants."
      />
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading teams...</div>}>
      <TeamsView />
    </Suspense>
  );
}
