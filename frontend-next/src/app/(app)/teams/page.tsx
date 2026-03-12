"use client";

import { Suspense } from 'react';
import TeamsView from '@/components/teams/TeamsView';

export default function TeamsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading teams...</div>}>
      <TeamsView />
    </Suspense>
  );
}
