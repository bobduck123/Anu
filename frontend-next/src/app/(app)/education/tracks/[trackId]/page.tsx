'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, LearningModule, LearningTrack } from '@/lib/api';

export default function EducationTrackPage() {
  const params = useParams();
  const trackId = Number(params?.trackId);
  const [track, setTrack] = useState<LearningTrack | null>(null);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackId) return;
    api.education.getTrack(trackId)
      .then((data) => {
        setTrack(data.track);
        setModules(data.modules || []);
      })
      .finally(() => setLoading(false));
  }, [trackId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--color-muted-foreground)]">Loading track...</div>;
  }

  if (!track) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--color-muted-foreground)]">Track not found.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="card-civic">
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>{track.title}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">{track.description}</p>
          <div className="text-xs text-[var(--color-muted-foreground)] mt-3">Pillar: {track.pillar}</div>
        </div>

        <div className="space-y-4">
          {modules.map((module) => (
            <div key={module.id} className="card-civic flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{module.title}</h2>
                <p className="text-xs text-[var(--color-muted-foreground)]">{module.description}</p>
                <div className="text-xs text-[var(--color-muted-foreground)] mt-2">
                  Completion {module.completion_threshold}% · Retakes {module.retake_limit}
                </div>
              </div>
              <Link href={`/education/modules/${module.id}`} className="btn-pill btn-pill-primary text-sm">Open Module</Link>
            </div>
          ))}
          {modules.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">No modules yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
