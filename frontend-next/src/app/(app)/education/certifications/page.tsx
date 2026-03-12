'use client';

import { useEffect, useState } from 'react';
import { api, CertificationRecord, CompetencyProfile } from '@/lib/api';

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<CertificationRecord[]>([]);
  const [profile, setProfile] = useState<CompetencyProfile | null>(null);

  useEffect(() => {
    api.education.getCertifications().then(setCertifications);
    api.education.getCompetencyProfile().then(setProfile).catch(() => null);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Certifications</h1>
          <p className="text-[var(--color-muted-foreground)]">Immutable records tied to governance eligibility.</p>
        </div>

        <div className="card-civic">
          <h2 className="text-lg font-semibold mb-3">Competency Profile</h2>
          {profile?.competency_matrix ? (
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
          )}
        </div>

        <div className="card-civic">
          <h2 className="text-lg font-semibold mb-4">Issued Certificates</h2>
          {certifications.length === 0 ? (
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
      </div>
    </div>
  );
}
