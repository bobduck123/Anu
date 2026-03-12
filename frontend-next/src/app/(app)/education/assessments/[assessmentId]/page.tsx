'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Assessment } from '@/lib/api';

export default function EducationAssessmentPage() {
  const params = useParams();
  const assessmentId = Number(params?.assessmentId);
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    if (!assessmentId) return;
    api.education.getAssessment(assessmentId).then(setAssessment);
  }, [assessmentId]);

  if (!assessment) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--color-muted-foreground)]">Loading assessment...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="card-civic">
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>{assessment.title}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Pass score: {assessment.pass_score}% · Retakes: {assessment.retake_limit}</p>
        </div>

        <div className="card-civic">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Assessment shell ready. Connect assessment logic and question banks when content is delivered.
          </p>
        </div>
      </div>
    </div>
  );
}
