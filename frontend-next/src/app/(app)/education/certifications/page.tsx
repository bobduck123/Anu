'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, CertificationRecord, CompetencyProfile } from '@/lib/api';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { EducationLayerShell } from '@/components/education/ui/EducationLayerShell';
import { buildAuthHref } from '@/lib/auth/returnTo';

interface VerificationResult {
  certificate_uid: string;
  module_id: number;
  issued_at?: string;
  expires_at?: string | null;
  status: string;
}

export default function CertificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [certifications, setCertifications] = useState<CertificationRecord[]>([]);
  const [publicRegistry, setPublicRegistry] = useState<CertificationRecord[]>([]);
  const [profile, setProfile] = useState<CompetencyProfile | null>(null);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [verificationUid, setVerificationUid] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const authHref = useMemo(() => buildAuthHref('/education/certifications'), []);

  useEffect(() => {
    api.education
      .getPublicCertifications()
      .then(setPublicRegistry)
      .catch((err) => {
        const actionable = toActionableSurfaceError({
          area: 'Public certifications registry',
          rawMessage: err instanceof Error ? err.message : null,
          fallbackHref: '/education',
          fallbackLabel: 'Back to education hub',
        });
        setRegistryError(`${actionable.headline}. ${actionable.detail}`);
      });
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      setCertifications([]);
      setProfile(null);
      return;
    }
    api.education.getCertifications().then(setCertifications).catch(() => setCertifications([]));
    api.education.getCompetencyProfile().then(setProfile).catch(() => setProfile(null));
  }, [authLoading, isAuthenticated]);

  const verifyCertificate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const uid = verificationUid.trim();
    if (!uid) {
      setVerificationError('Enter a certificate UID to verify.');
      return;
    }

    setVerifying(true);
    setVerificationError(null);
    setVerificationResult(null);
    try {
      const result = await api.education.verifyCertificate(uid);
      setVerificationResult(result);
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : 'Certificate verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <EducationLayerShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        <section className="edu-card edu-card-highlight p-6 md:p-8">
          <h1 className="text-4xl font-bold mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
            Certifications
          </h1>
          <p className="text-[color:rgba(246,212,203,0.75)]">
            Public registry access stays open. Personal competency and issued credentials stay tied to your session.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] p-4 text-sm text-[color:rgba(246,212,203,0.75)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.6)]">1. Learn</p>
              <p className="mt-2">Complete modules and assessments inside the curriculum flow.</p>
            </article>
            <article className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] p-4 text-sm text-[color:rgba(246,212,203,0.75)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.6)]">2. Credential</p>
              <p className="mt-2">Issue certificates for completed modules through your learner session.</p>
            </article>
            <article className="rounded-xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] p-4 text-sm text-[color:rgba(246,212,203,0.75)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.6)]">3. Verify</p>
              <p className="mt-2">Use public UID verification to confirm trust and credential state.</p>
            </article>
          </div>
        </section>

        <section className="edu-card p-6">
          <h2 className="text-lg font-semibold mb-3 text-[var(--color-foreground)]">Competency Profile</h2>
          {authLoading ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.7)]">Checking learner session…</p>
          ) : isAuthenticated ? (
            profile?.competency_matrix ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(profile.competency_matrix).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-lg border border-[color:rgba(246,212,203,0.15)]">
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.6)]">{key}</p>
                    <p className="text-2xl font-semibold font-mono-data text-[var(--color-foreground)]">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[color:rgba(246,212,203,0.7)]">No competency profile yet.</p>
            )
          ) : (
            <p className="text-sm text-[color:rgba(246,212,203,0.7)]">
              <Link href={authHref} className="font-medium text-[var(--color-foreground)] hover:underline">
                Sign in
              </Link>{' '}
              to view your competency matrix and personal certification history.
            </p>
          )}
        </section>

        <section className="edu-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-[var(--color-foreground)]">Certificate Verifier</h2>
          <form onSubmit={verifyCertificate} className="space-y-3">
            <label className="block text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.6)]" htmlFor="certificate-uid-input">
              Public certificate UID
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="certificate-uid-input"
                value={verificationUid}
                onChange={(event) => setVerificationUid(event.target.value)}
                placeholder="e.g. bba4f4f2-..."
                className="input-civic min-w-[18rem] flex-1"
              />
              <button type="submit" disabled={verifying} className="btn-pill btn-pill-primary text-sm disabled:opacity-60">
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </form>

          {verificationError ? <p className="mt-3 text-sm text-[#7c413c]">{verificationError}</p> : null}
          {verificationResult ? (
            <div className="mt-4 rounded-lg border border-[color:rgba(246,212,203,0.15)] bg-[color:rgba(246,212,203,0.03)] p-4 text-sm text-[color:rgba(246,212,203,0.75)]">
              <p className="font-semibold text-[var(--color-foreground)]">Certificate verified</p>
              <p className="mt-2">UID: {verificationResult.certificate_uid}</p>
              <p>Module: {verificationResult.module_id}</p>
              <p>Status: {verificationResult.status}</p>
              <p>
                Issued:{' '}
                {verificationResult.issued_at ? new Date(verificationResult.issued_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          ) : null}
        </section>

        <section className="edu-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-[var(--color-foreground)]">Your Issued Certificates</h2>
          {!isAuthenticated ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.7)]">Sign in to see your personal certificate history.</p>
          ) : certifications.length === 0 ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.7)]">No certificates yet.</p>
          ) : (
            <div className="space-y-3">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between border-b border-[color:rgba(246,212,203,0.1)] pb-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">Certificate {cert.certificate_uid}</p>
                    <p className="text-xs text-[color:rgba(246,212,203,0.6)]">
                      Module {cert.module_id} · Issued {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      cert.status === 'active' ? 'bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]' : 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.75)]'
                    }`}
                  >
                    {cert.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="edu-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-[var(--color-foreground)]">Public Credential Registry</h2>
          {registryError ? (
            <div className="space-y-3">
              <p className="text-sm text-[#7c413c]">{registryError}</p>
              <p className="text-xs text-[color:rgba(246,212,203,0.6)]">
                Registry refresh is unavailable right now. You can keep navigating curriculum, assessments, and
                regeneration flows without losing session continuity.
              </p>
            </div>
          ) : publicRegistry.length === 0 ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.7)]">No public certificates are listed yet.</p>
          ) : (
            <div className="space-y-3">
              {publicRegistry.map((cert) => (
                <div key={cert.certificate_uid} className="flex items-center justify-between border-b border-[color:rgba(246,212,203,0.1)] pb-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">Certificate {cert.certificate_uid}</p>
                    <p className="text-xs text-[color:rgba(246,212,203,0.6)]">
                      Module {cert.module_id} · Issued {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      cert.status === 'active' ? 'bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]' : 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.75)]'
                    }`}
                  >
                    {cert.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </EducationLayerShell>
  );
}
