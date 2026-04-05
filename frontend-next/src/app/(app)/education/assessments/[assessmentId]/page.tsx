'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, Assessment, LearningModule, RiskTier } from '@/lib/api';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { EducationLayerShell } from '@/components/education/ui/EducationLayerShell';

export default function EducationAssessmentPage() {
  const params = useParams();
  const assessmentId = Number(params?.assessmentId);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [module, setModule] = useState<LearningModule | null>(null);
  const [riskTiers, setRiskTiers] = useState<RiskTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId) {
      setLoading(false);
      setError('Assessment identifier is missing.');
      return;
    }

    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      try {
        const assessmentData = await api.education.getAssessment(assessmentId);
        setAssessment(assessmentData);

        const [moduleResult, tierResult] = await Promise.allSettled([
          api.education.getModule(assessmentData.module_id),
          api.education.getRiskTiers(),
        ]);

        if (moduleResult.status === 'fulfilled') {
          setModule(moduleResult.value.module);
        } else {
          setModule(null);
        }

        if (tierResult.status === 'fulfilled') {
          setRiskTiers(tierResult.value);
        } else {
          setRiskTiers([]);
        }
      } catch (err) {
        const actionable = toActionableSurfaceError({
          area: 'Education assessment',
          rawMessage: err instanceof Error ? err.message : null,
          fallbackHref: '/education',
          fallbackLabel: 'Back to education hub',
        });
        setError(`${actionable.headline}. ${actionable.detail}`);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [assessmentId]);

  const nextRiskTier = useMemo(() => {
    if (riskTiers.length < 1) {
      return null;
    }
    return [...riskTiers].sort((a, b) => a.level - b.level)[0];
  }, [riskTiers]);

  return (
    <EducationLayerShell>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        <Link href="/education" className="inline-flex text-xs uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.7)] hover:text-[var(--color-foreground)]">
          ← Education hub
        </Link>

        {loading ? (
          <div className="edu-card p-8 text-sm text-[color:rgba(246,212,203,0.75)]">Loading assessment context…</div>
        ) : error ? (
          <div className="edu-card p-8 text-sm text-[#7c413c]">{error}</div>
        ) : !assessment ? (
          <div className="edu-card p-8 text-sm text-[color:rgba(246,212,203,0.75)]">Assessment not found.</div>
        ) : (
          <>
            <section className="edu-card edu-card-highlight p-6 md:p-8">
              <p className="edu-pill">Assessment</p>
              <h1 className="mt-4 text-3xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
                {assessment.title}
              </h1>

              <div className="mt-5 grid gap-3 md:grid-cols-3 text-xs">
                <div className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-3 py-2 text-[color:rgba(246,212,203,0.75)]">
                  <p className="uppercase tracking-[0.13em] text-[color:rgba(246,212,203,0.6)]">Pass threshold</p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">{assessment.pass_score}%</p>
                </div>
                <div className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-3 py-2 text-[color:rgba(246,212,203,0.75)]">
                  <p className="uppercase tracking-[0.13em] text-[color:rgba(246,212,203,0.6)]">Retakes</p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">{assessment.retake_limit}</p>
                </div>
                <div className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-3 py-2 text-[color:rgba(246,212,203,0.75)]">
                  <p className="uppercase tracking-[0.13em] text-[color:rgba(246,212,203,0.6)]">Version</p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">{assessment.version}</p>
                </div>
              </div>

              {module ? (
                <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.6)]">
                  Module context · {module.title} · completion target {module.completion_threshold}%
                </p>
              ) : null}
            </section>

            <section className="edu-card p-6">
              <p className="text-sm leading-7 text-[color:rgba(246,212,203,0.75)]">
                Assessment delivery is ready for question-bank integration and practical competency checks. This surface
                keeps the thresholds visible so learners can trust what counts as successful completion before they
                start.
              </p>
            </section>

            <section className="edu-card p-5 space-y-3">
              <p className="text-xs uppercase tracking-[0.13em] text-[color:rgba(246,212,203,0.6)]">After completion</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] p-4 text-sm text-[color:rgba(246,212,203,0.75)]">
                  <p className="font-semibold text-[var(--color-foreground)]">Credential pathway</p>
                  <p className="mt-2">Issue and review certificates once module outcomes are complete.</p>
                  <Link href="/education/certifications" className="mt-3 inline-flex btn-pill btn-pill-outline text-xs">
                    Open certifications
                  </Link>
                </article>
                <article className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] p-4 text-sm text-[color:rgba(246,212,203,0.75)]">
                  <p className="font-semibold text-[var(--color-foreground)]">Practice linkage</p>
                  <p className="mt-2">Translate learning into logged regenerative actions with verification flow.</p>
                  <Link href="/education/regeneration" className="mt-3 inline-flex btn-pill btn-pill-outline text-xs">
                    Open regeneration
                  </Link>
                </article>
              </div>
            </section>

            {nextRiskTier ? (
              <section className="edu-card p-5">
                <p className="text-xs uppercase tracking-[0.13em] text-[color:rgba(246,212,203,0.6)]">Confidence signal</p>
                <p className="mt-2 text-sm text-[color:rgba(246,212,203,0.75)]">
                  First governance risk tier: <span className="font-semibold text-[var(--color-foreground)]">{nextRiskTier.name}</span>
                  {' · '}minimum cert level {nextRiskTier.min_cert_level}
                  {nextRiskTier.compliance_required ? ' · compliance required' : ''}
                </p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </EducationLayerShell>
  );
}
