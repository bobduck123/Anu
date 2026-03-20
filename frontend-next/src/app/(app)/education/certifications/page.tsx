'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, CertificationRecord, CompetencyProfile } from '@/lib/api';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { EducationLayerShell } from '@/components/education/ui/EducationLayerShell';

function buildAuthHref(returnTo: string): string {
  const params = new URLSearchParams();
  params.set('returnTo', returnTo);
  return `/auth?${params.toString()}`;
}

export default function CertificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [certifications, setCertifications] = useState<CertificationRecord[]>([]);
  const [publicRegistry, setPublicRegistry] = useState<CertificationRecord[]>([]);
  const [profile, setProfile] = useState<CompetencyProfile | null>(null);
  const [registryError, setRegistryError] = useState<string | null>(null);
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

  return (
    <EducationLayerShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2 text-white" style={{ fontFamily: 'var(--font-serif)' }}>
            Certifications
          </h1>
          <p className="text-white/75">
            Public registry access stays open. Personal competency and issued credentials stay tied to your session.
          </p>
        </div>

        <section className="edu-card p-6">
          <h2 className="text-lg font-semibold mb-3 text-white">Competency Profile</h2>
          {authLoading ? (
            <p className="text-sm text-white/70">Checking learner session…</p>
          ) : isAuthenticated ? (
            profile?.competency_matrix ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(profile.competency_matrix).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-lg border border-white/15">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/60">{key}</p>
                    <p className="text-2xl font-semibold font-mono-data text-white">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/70">No competency profile yet.</p>
            )
          ) : (
            <p className="text-sm text-white/70">
              <Link href={authHref} className="font-medium text-white hover:underline">
                Sign in
              </Link>{' '}
              to view your competency matrix and personal certification history.
            </p>
          )}
        </section>

        <section className="edu-card p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Your Issued Certificates</h2>
          {!isAuthenticated ? (
            <p className="text-sm text-white/70">Sign in to see your personal certificate history.</p>
          ) : certifications.length === 0 ? (
            <p className="text-sm text-white/70">No certificates yet.</p>
          ) : (
            <div className="space-y-3">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div>
                    <p className="text-sm font-medium text-white">Certificate {cert.certificate_uid}</p>
                    <p className="text-xs text-white/60">
                      Module {cert.module_id} · Issued {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      cert.status === 'active'
                        ? 'bg-emerald-400/20 text-emerald-100'
                        : 'bg-white/15 text-white/75'
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
          <h2 className="text-lg font-semibold mb-4 text-white">Public Credential Registry</h2>
          {registryError ? (
            <p className="text-sm text-rose-200">{registryError}</p>
          ) : publicRegistry.length === 0 ? (
            <p className="text-sm text-white/70">No public certificates are listed yet.</p>
          ) : (
            <div className="space-y-3">
              {publicRegistry.map((cert) => (
                <div key={cert.certificate_uid} className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div>
                    <p className="text-sm font-medium text-white">Certificate {cert.certificate_uid}</p>
                    <p className="text-xs text-white/60">
                      Module {cert.module_id} · Issued {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      cert.status === 'active'
                        ? 'bg-emerald-400/20 text-emerald-100'
                        : 'bg-white/15 text-white/75'
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
