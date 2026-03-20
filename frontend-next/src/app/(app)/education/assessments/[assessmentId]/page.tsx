'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, Assessment } from '@/lib/api';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { EducationLayerShell } from '@/components/education/ui/EducationLayerShell';

export default function EducationAssessmentPage() {
  const params = useParams();
  const assessmentId = Number(params?.assessmentId);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId) {
      setLoading(false);
      setError('Assessment identifier is missing.');
      return;
    }

    setLoading(true);
    setError(null);

    api.education
      .getAssessment(assessmentId)
      .then(setAssessment)
      .catch((err) => {
        const actionable = toActionableSurfaceError({
          area: 'Education assessment',
          rawMessage: err instanceof Error ? err.message : null,
          fallbackHref: '/education',
          fallbackLabel: 'Back to education hub',
        });
        setError(`${actionable.headline}. ${actionable.detail}`);
      })
      .finally(() => setLoading(false));
  }, [assessmentId]);

  return (
    <EducationLayerShell>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        <Link href="/education" className="inline-flex text-xs uppercase tracking-[0.18em] text-white/70 hover:text-white">
          ← Education hub
        </Link>

        {loading ? (
          <div className="edu-card p-8 text-sm text-white/75">Loading assessment…</div>
        ) : error ? (
          <div className="edu-card p-8 text-sm text-rose-200">{error}</div>
        ) : !assessment ? (
          <div className="edu-card p-8 text-sm text-white/75">Assessment not found.</div>
        ) : (
          <>
            <section className="edu-card p-6 md:p-8">
              <p className="edu-pill">Assessment</p>
              <h1 className="mt-4 text-3xl font-semibold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                {assessment.title}
              </h1>
              <p className="mt-3 text-sm text-white/75">
                Pass score {assessment.pass_score}% · Retakes {assessment.retake_limit}
              </p>
            </section>

            <section className="edu-card p-6">
              <p className="text-sm leading-7 text-white/75">
                Assessment shell is ready. Connect assessment delivery and question-bank execution when curriculum payloads are published.
              </p>
            </section>
          </>
        )}
      </div>
    </EducationLayerShell>
  );
}
