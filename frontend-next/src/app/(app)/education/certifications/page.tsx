'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, CertificationRecord, CompetencyProfile } from '@/lib/api';

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
        setRegistryError(err instanceof Error ? err.message : 'Public registry is unavailable.');
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
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Certifications</h1>
          <p className="text-[var(--color-muted-foreground)]">
            Public registry access stays open. Personal competency and issued credentials stay tied to your session.
          </p>
        </div>

        <div className="card-civic">
          <h2 className="text-lg font-semibold mb-3">Competency Profile</h2>
          {authLoading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Checking learner session...</p>
          ) : isAuthenticated ? (
            profile?.competency_matrix ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(profile.competency_matrix).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-lg border border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-muted-foreground)]">{key}</p>
                    <p className="text-2xl font-semibold font-mono-data">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">No competency profile yet.</p>
            )
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              <Link href={authHref} className="font-medium text-[var(--color-institutional)] hover:underline">
                Sign in
              </Link>{' '}
              to view your competency matrix and personal certification history.
            </p>
          )}
        </div>

        <div className="card-civic">
          <h2 className="text-lg font-semibold mb-4">Your Issued Certificates</h2>
          {!isAuthenticated ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Sign in to see your personal certificate history.</p>
          ) : certifications.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No certificates yet.</p>
          ) : (
            <div className="space-y-3">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                  <div>
                    <p className="text-sm font-medium">Certificate {cert.certificate_uid}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Module {cert.module_id} · Issued {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cert.status === 'active' ? 'bg-[var(--color-sage-light)] text-[var(--color-forest)]' : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'}`}>
                    {cert.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-civic">
          <h2 className="text-lg font-semibold mb-4">Public Credential Registry</h2>
          {registryError ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">{registryError}</p>
          ) : publicRegistry.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No public certificates are listed yet.</p>
          ) : (
            <div className="space-y-3">
              {publicRegistry.map((cert) => (
                <div key={cert.certificate_uid} className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                  <div>
                    <p className="text-sm font-medium">Certificate {cert.certificate_uid}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Module {cert.module_id} · Issued {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cert.status === 'active' ? 'bg-[var(--color-sage-light)] text-[var(--color-forest)]' : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'}`}>
                    {cert.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
