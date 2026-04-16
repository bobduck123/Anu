'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ControlApiError,
  getControlSiteDomainBindings,
  getControlSiteManifestAuthoring,
  getControlSitePublishReadiness,
  normalizeControlCanonicalDomain,
  publishControlSiteManifestAuthoring,
  type ControlSiteDomainBindingsPayload,
  type ControlSitePublishReadinessPayload,
  updateControlSiteManifestAuthoring,
  updateControlSiteDomainBindings,
  type ControlSiteManifestAuthoringPayload,
  type ManifestAuthoringLink,
  type ManifestAuthoringNavItem,
} from '@/lib/api/controlClient';

const MODULE_ALLOWLIST = ['community', 'impact', 'education', 'trust', 'transparency', 'archive'] as const;

function emptyNavItem(): ManifestAuthoringNavItem {
  return { label: '', href: '/community', module: 'community' };
}

function emptyLinkItem(): ManifestAuthoringLink {
  return { label: '', href: '/privacy' };
}

export default function TenantManifestAuthoringPage() {
  const params = useParams<{ nodeId: string }>();
  const nodeId = Number(params?.nodeId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [validationDetails, setValidationDetails] = useState<Record<string, unknown> | null>(null);
  const [payload, setPayload] = useState<ControlSiteManifestAuthoringPayload | null>(null);
  const [domainBindingsPayload, setDomainBindingsPayload] = useState<ControlSiteDomainBindingsPayload | null>(null);
  const [domainPanelVisibility, setDomainPanelVisibility] = useState<'unknown' | 'visible' | 'hidden'>('unknown');
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainMessage, setDomainMessage] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [publishReadinessPayload, setPublishReadinessPayload] = useState<ControlSitePublishReadinessPayload | null>(null);
  const [readinessPanelVisibility, setReadinessPanelVisibility] = useState<'unknown' | 'visible' | 'hidden'>('unknown');
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);

  const [siteName, setSiteName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoAssetRef, setLogoAssetRef] = useState('');
  const [faviconAssetRef, setFaviconAssetRef] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [navItems, setNavItems] = useState<ManifestAuthoringNavItem[]>([]);
  const [footerLinks, setFooterLinks] = useState<ManifestAuthoringLink[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [legalPrivacy, setLegalPrivacy] = useState('/privacy');
  const [legalTerms, setLegalTerms] = useState('/terms');
  const [legalCodeOfConduct, setLegalCodeOfConduct] = useState('/code-of-conduct');
  const [trustCenter, setTrustCenter] = useState('/trust');
  const [trustTransparency, setTrustTransparency] = useState('/transparency');
  const [trustArchive, setTrustArchive] = useState('/archive');
  const [contactEmail, setContactEmail] = useState('');
  const [contactUrl, setContactUrl] = useState('/contact');
  const [locationLabel, setLocationLabel] = useState('');

  function applyPayloadToForm(result: ControlSiteManifestAuthoringPayload) {
    setPayload(result);
    setSiteName(result.authoring.site_name || '');
    setTagline(result.authoring.tagline || '');
    setLogoAssetRef(result.authoring.logo_asset_ref || '');
    setFaviconAssetRef(result.authoring.favicon_asset_ref || '');
    setPrimaryColor(result.authoring.theme_tokens?.primary_color || '');
    setSecondaryColor(result.authoring.theme_tokens?.secondary_color || '');
    setAccentColor(result.authoring.theme_tokens?.accent_color || '');
    setNavItems(result.authoring.nav_items || []);
    setFooterLinks(result.authoring.footer_links || []);
    setEnabledModules(result.authoring.enabled_modules || []);
    setLegalPrivacy(result.authoring.legal_links?.privacy || '/privacy');
    setLegalTerms(result.authoring.legal_links?.terms || '/terms');
    setLegalCodeOfConduct(result.authoring.legal_links?.code_of_conduct || '/code-of-conduct');
    setTrustCenter(result.authoring.trust_links?.trust_center || '/trust');
    setTrustTransparency(result.authoring.trust_links?.transparency || '/transparency');
    setTrustArchive(result.authoring.trust_links?.archive || '/archive');
    setContactEmail(result.authoring.contact?.email || '');
    setContactUrl(result.authoring.contact?.public_contact_url || '/contact');
    setLocationLabel(result.authoring.contact?.location_label || '');
  }

  useEffect(() => {
    if (!Number.isFinite(nodeId) || nodeId <= 0) {
      setLoading(false);
      setError('Invalid tenant id.');
      return;
    }

    let active = true;
    (async () => {
      try {
        const result = await getControlSiteManifestAuthoring(nodeId);
        if (!active) return;
        applyPayloadToForm(result);
        setConflictNotice(null);
        setPublishNotice(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load manifest authoring payload.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [nodeId]);

  useEffect(() => {
    if (!Number.isFinite(nodeId) || nodeId <= 0) {
      return;
    }

    let active = true;
    setReadinessLoading(true);
    setReadinessError(null);

    (async () => {
      try {
        const readinessPayload = await getControlSitePublishReadiness(nodeId);
        if (!active) {
          return;
        }
        setPublishReadinessPayload(readinessPayload);
        setReadinessPanelVisibility('visible');
      } catch (err) {
        if (!active) {
          return;
        }
        if (err instanceof ControlApiError && err.code === 'platform_admin_required') {
          setReadinessPanelVisibility('hidden');
          return;
        }
        setReadinessPanelVisibility('visible');
        setReadinessError(err instanceof Error ? err.message : 'Failed to load publish readiness.');
      } finally {
        if (active) {
          setReadinessLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [nodeId]);

  async function refreshPublishReadiness() {
    if (!Number.isFinite(nodeId) || nodeId <= 0) {
      return;
    }

    setReadinessLoading(true);
    setReadinessError(null);
    try {
      const readinessPayload = await getControlSitePublishReadiness(nodeId);
      setPublishReadinessPayload(readinessPayload);
      setReadinessPanelVisibility('visible');
    } catch (err) {
      if (err instanceof ControlApiError && err.code === 'platform_admin_required') {
        setReadinessPanelVisibility('hidden');
        return;
      }
      setReadinessPanelVisibility('visible');
      setReadinessError(err instanceof Error ? err.message : 'Failed to refresh publish readiness.');
    } finally {
      setReadinessLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(nodeId) || nodeId <= 0) {
      return;
    }

    let active = true;
    setDomainLoading(true);
    setDomainError(null);
    setDomainMessage(null);

    (async () => {
      try {
        const domainPayload = await getControlSiteDomainBindings(nodeId);
        if (!active) {
          return;
        }
        setDomainBindingsPayload(domainPayload);
        setDomainInput((domainPayload.canonical_domains || []).join('\n'));
        setDomainPanelVisibility('visible');
      } catch (err) {
        if (!active) {
          return;
        }
        if (err instanceof ControlApiError && err.code === 'platform_admin_required') {
          setDomainPanelVisibility('hidden');
          return;
        }
        setDomainPanelVisibility('visible');
        setDomainError(err instanceof Error ? err.message : 'Failed to load domain bindings.');
      } finally {
        if (active) {
          setDomainLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [nodeId]);

  const moduleSet = useMemo(() => new Set(enabledModules), [enabledModules]);
  const draftAheadOfLive = Boolean(payload?.revision_token && payload?.published_revision_token && payload.revision_token !== payload.published_revision_token);
  const freshnessLabel = draftAheadOfLive ? 'Draft ahead of live' : 'Live';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(nodeId) || nodeId <= 0) {
      return;
    }

    setSaving(true);
    setError(null);
    setConflictNotice(null);
    setPublishNotice(null);
    setValidationDetails(null);

    if (!payload?.revision_token) {
      setSaving(false);
      setError('Missing revision token. Reload before saving.');
      return;
    }

    try {
      const updated = await updateControlSiteManifestAuthoring(nodeId, payload.revision_token, {
        site_name: siteName,
        tagline,
        logo_asset_ref: logoAssetRef || null,
        favicon_asset_ref: faviconAssetRef || null,
        theme_tokens: {
          primary_color: primaryColor || null,
          secondary_color: secondaryColor || null,
          accent_color: accentColor || null,
        },
        nav_items: navItems,
        enabled_modules: enabledModules,
        footer_links: footerLinks,
        legal_links: {
          privacy: legalPrivacy,
          terms: legalTerms,
          code_of_conduct: legalCodeOfConduct,
        },
        trust_links: {
          trust_center: trustCenter,
          transparency: trustTransparency,
          archive: trustArchive,
        },
        contact: {
          email: contactEmail || null,
          public_contact_url: contactUrl,
          location_label: locationLabel || null,
        },
      });

      applyPayloadToForm(updated);
      setError(null);
      setConflictNotice(null);
    } catch (err) {
      if (err instanceof ControlApiError) {
        if (err.status === 409 && err.code === 'manifest_authoring_revision_conflict') {
          const details = err.details && typeof err.details === 'object' ? (err.details as Record<string, unknown>) : null;
          const latestPayload = details?.latest_payload as ControlSiteManifestAuthoringPayload | undefined;
          if (latestPayload && typeof latestPayload === 'object') {
            applyPayloadToForm(latestPayload);
          }
          setConflictNotice(
            typeof details?.conflict_message === 'string'
              ? details.conflict_message
              : 'Another operator saved newer changes. Latest saved values have been loaded. Review and save again.',
          );
          setError(null);
          setValidationDetails(details || null);
        } else {
          setError(err.message);
          if (err.details && typeof err.details === 'object') {
            setValidationDetails(err.details as Record<string, unknown>);
          }
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save manifest authoring payload.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishDraft() {
    if (!Number.isFinite(nodeId) || nodeId <= 0) {
      return;
    }
    if (!payload?.revision_token) {
      setError('Missing revision token. Reload before publishing.');
      return;
    }

    setPublishing(true);
    setError(null);
    setConflictNotice(null);
    setPublishNotice(null);
    setValidationDetails(null);

    try {
      const updated = await publishControlSiteManifestAuthoring(nodeId, payload.revision_token);
      applyPayloadToForm(updated);
      setPublishNotice('Draft published to public shell.');
      await refreshPublishReadiness();
    } catch (err) {
      if (err instanceof ControlApiError) {
        if (err.status === 409 && err.code === 'manifest_publish_revision_conflict') {
          const details = err.details && typeof err.details === 'object' ? (err.details as Record<string, unknown>) : null;
          const latestPayload = details?.latest_payload as ControlSiteManifestAuthoringPayload | undefined;
          if (latestPayload && typeof latestPayload === 'object') {
            applyPayloadToForm(latestPayload);
          }
          setConflictNotice(
            typeof details?.conflict_message === 'string'
              ? details.conflict_message
              : 'Draft changed before publish. Latest draft has been loaded. Review and publish again.',
          );
        } else {
          setError(err.message);
          if (err.details && typeof err.details === 'object') {
            setValidationDetails(err.details as Record<string, unknown>);
          }
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to publish draft manifest.');
      }
    } finally {
      setPublishing(false);
    }
  }

  async function handleDomainBindingsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(nodeId) || nodeId <= 0) {
      return;
    }

    const normalizedDomains = domainInput
      .split(/[\n,]/)
      .map((item) => normalizeControlCanonicalDomain(item))
      .filter(Boolean);

    setDomainSaving(true);
    setDomainError(null);
    setDomainMessage(null);

    try {
      const updated = await updateControlSiteDomainBindings(nodeId, normalizedDomains);
      setDomainBindingsPayload(updated);
      setDomainInput((updated.canonical_domains || []).join('\n'));
      if (updated.mutation?.idempotent_noop) {
        setDomainMessage('Domain bindings already match the saved published state.');
      } else {
        setDomainMessage('Published domain bindings updated.');
      }
      await refreshPublishReadiness();
    } catch (err) {
      if (err instanceof ControlApiError) {
        setDomainError(err.message);
        return;
      }
      setDomainError(err instanceof Error ? err.message : 'Failed to update domain bindings.');
    } finally {
      setDomainSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-[color:rgba(246,212,203,0.82)]">Loading manifest authoring...</div>;
  }

  if (error && !payload) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-red-300">{error}</p>
        <Link href="/control/tenants" className="text-sm underline">
          Back to tenants
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.66)]">WL-004 draft/publish manifest authoring</p>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Tenant public manifest editor</h1>
        <p className="mt-2 text-sm text-[color:rgba(246,212,203,0.84)]">
          Tenant <code>{payload?.node_slug}</code> · Site key <code>{payload?.read_only.site_key}</code>
        </p>
        <p className="mt-2 text-xs text-[color:rgba(246,212,203,0.72)]">
          Draft revision <code>{payload?.revision_token || '—'}</code> · Published revision <code>{payload?.published_revision_token || '—'}</code>
        </p>
      </div>

      <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.66)]">Published state</p>
        <p className="mt-2 text-sm font-medium text-[var(--color-foreground)]">{freshnessLabel}</p>
        <p className="text-xs text-[color:rgba(246,212,203,0.8)]">Published at: {payload?.published_at || 'Not published yet'}</p>
        <p className="text-xs text-[color:rgba(246,212,203,0.8)]">Published by: {payload?.published_by || 'Unknown'}</p>
      </section>

      {readinessPanelVisibility === 'visible' ? (
        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.66)]">Publish readiness</p>
          <p className="mt-2 text-sm text-[color:rgba(246,212,203,0.86)]">
            Preflight checks cover domain binding, published manifest presence, and required trust/legal links.
          </p>

          {readinessLoading ? (
            <p className="mt-3 text-sm text-[color:rgba(246,212,203,0.8)]">Evaluating publish readiness...</p>
          ) : null}

          {!readinessLoading && publishReadinessPayload ? (
            <div className="mt-3 space-y-3 text-sm">
              <p className={publishReadinessPayload.ready ? 'text-emerald-300' : 'text-amber-200'}>
                {publishReadinessPayload.ready ? 'Ready for public launch preflight.' : 'Not ready for public launch preflight.'}
              </p>

              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.66)]">Blocking issues</p>
                {publishReadinessPayload.blocking_issues.length === 0 ? (
                  <p className="mt-1 text-[color:rgba(246,212,203,0.82)]">None</p>
                ) : (
                  <ul className="mt-1 list-disc pl-4 text-red-200">
                    {publishReadinessPayload.blocking_issues.map((issue) => (
                      <li key={`blocking-${issue.code}`}>{issue.message}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.66)]">Warnings</p>
                {publishReadinessPayload.warnings.length === 0 ? (
                  <p className="mt-1 text-[color:rgba(246,212,203,0.82)]">None</p>
                ) : (
                  <ul className="mt-1 list-disc pl-4 text-amber-200">
                    {publishReadinessPayload.warnings.map((warning) => (
                      <li key={`warning-${warning.code}`}>{warning.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          {readinessError ? <p className="mt-3 text-sm text-red-300">{readinessError}</p> : null}
        </section>
      ) : null}

      {domainPanelVisibility === 'visible' ? (
        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.66)]">Platform-admin domain bindings</p>
          <p className="mt-2 text-sm text-[color:rgba(246,212,203,0.86)]">
            Update canonical public host/domain bindings used by published site resolution.
          </p>

          {domainLoading ? <p className="mt-3 text-sm text-[color:rgba(246,212,203,0.8)]">Loading domain bindings...</p> : null}

          <form className="mt-3 space-y-3" onSubmit={handleDomainBindingsSubmit}>
            <label className="block text-sm">
              Canonical domains (one per line)
              <textarea
                aria-label="Canonical domains"
                className="mt-1 min-h-[110px] w-full rounded border px-3 py-2 text-sm text-black"
                value={domainInput}
                onChange={(event) => setDomainInput(event.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={domainSaving || domainLoading}
              className="rounded border border-[color:rgba(246,212,203,0.3)] px-4 py-2 text-sm disabled:opacity-60"
            >
              {domainSaving ? 'Saving domains...' : 'Save domain bindings'}
            </button>
          </form>

          <div className="mt-3 rounded border border-[color:rgba(246,212,203,0.2)] p-3 text-xs text-[color:rgba(246,212,203,0.82)]">
            <p className="font-medium uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.66)]">Current published bindings</p>
            {(domainBindingsPayload?.canonical_domains || []).length === 0 ? (
              <p className="mt-2">No canonical domains are currently bound.</p>
            ) : (
              <ul className="mt-2 list-disc pl-4">
                {(domainBindingsPayload?.canonical_domains || []).map((domain) => (
                  <li key={domain}>{domain}</li>
                ))}
              </ul>
            )}
          </div>

          {domainMessage ? <p className="mt-3 text-sm text-emerald-300">{domainMessage}</p> : null}
          {domainError ? <p className="mt-3 text-sm text-red-300">{domainError}</p> : null}
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.66)]">Draft preview (control-only)</p>
          <p className="mt-2 text-sm">{String(payload?.site_manifest?.site_name || '—')}</p>
          <p className="text-xs text-[color:rgba(246,212,203,0.72)]">{String(payload?.site_manifest?.tagline || '—')}</p>
        </section>
        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.66)]">Published public shell</p>
          <p className="mt-2 text-sm">{String(payload?.published_site_manifest?.site_name || '—')}</p>
          <p className="text-xs text-[color:rgba(246,212,203,0.72)]">{String(payload?.published_site_manifest?.tagline || '—')}</p>
        </section>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <label className="block text-sm">Site name</label>
          <input aria-label="Site name" className="mt-1 w-full rounded border px-3 py-2 text-sm text-black" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          <label className="mt-3 block text-sm">Tagline</label>
          <input aria-label="Tagline" className="mt-1 w-full rounded border px-3 py-2 text-sm text-black" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </section>

        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <label className="block text-sm">Logo asset ref</label>
          <input aria-label="Logo asset ref" className="mt-1 w-full rounded border px-3 py-2 text-sm text-black" value={logoAssetRef} onChange={(e) => setLogoAssetRef(e.target.value)} />
          <label className="mt-3 block text-sm">Favicon asset ref</label>
          <input aria-label="Favicon asset ref" className="mt-1 w-full rounded border px-3 py-2 text-sm text-black" value={faviconAssetRef} onChange={(e) => setFaviconAssetRef(e.target.value)} />
        </section>

        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <p className="text-sm font-medium">Theme tokens (allowlisted)</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <input aria-label="Primary color" className="rounded border px-3 py-2 text-sm text-black" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
            <input aria-label="Secondary color" className="rounded border px-3 py-2 text-sm text-black" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
            <input aria-label="Accent color" className="rounded border px-3 py-2 text-sm text-black" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
          </div>
        </section>

        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <p className="text-sm font-medium">Enabled modules</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {MODULE_ALLOWLIST.map((moduleKey) => (
              <label key={moduleKey} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={moduleSet.has(moduleKey)}
                  onChange={(event) => {
                    setEnabledModules((prev) => {
                      const next = new Set(prev);
                      if (event.target.checked) {
                        next.add(moduleKey);
                      } else {
                        next.delete(moduleKey);
                      }
                      return Array.from(next);
                    });
                  }}
                />
                {moduleKey}
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <p className="text-sm font-medium">Navigation items</p>
          {navItems.map((item, idx) => (
            <div className="mt-2 grid gap-2 md:grid-cols-4" key={`nav-${idx}`}>
              <input
                aria-label={`Nav label ${idx + 1}`}
                className="rounded border px-3 py-2 text-sm text-black"
                value={item.label}
                onChange={(e) =>
                  setNavItems((prev) => prev.map((row, rowIdx) => (rowIdx === idx ? { ...row, label: e.target.value } : row)))
                }
              />
              <input
                aria-label={`Nav href ${idx + 1}`}
                className="rounded border px-3 py-2 text-sm text-black"
                value={item.href}
                onChange={(e) =>
                  setNavItems((prev) => prev.map((row, rowIdx) => (rowIdx === idx ? { ...row, href: e.target.value } : row)))
                }
              />
              <input
                aria-label={`Nav module ${idx + 1}`}
                className="rounded border px-3 py-2 text-sm text-black"
                value={item.module || ''}
                onChange={(e) =>
                  setNavItems((prev) =>
                    prev.map((row, rowIdx) => (rowIdx === idx ? { ...row, module: e.target.value || null } : row)),
                  )
                }
              />
              <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => setNavItems((prev) => prev.filter((_, i) => i !== idx))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="mt-3 rounded border px-3 py-2 text-sm" onClick={() => setNavItems((prev) => [...prev, emptyNavItem()])}>
            Add nav item
          </button>
        </section>

        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <p className="text-sm font-medium">Footer links</p>
          {footerLinks.map((item, idx) => (
            <div className="mt-2 grid gap-2 md:grid-cols-3" key={`footer-${idx}`}>
              <input aria-label={`Footer label ${idx + 1}`} className="rounded border px-3 py-2 text-sm text-black" value={item.label} onChange={(e) => setFooterLinks((prev) => prev.map((row, rowIdx) => (rowIdx === idx ? { ...row, label: e.target.value } : row)))} />
              <input aria-label={`Footer href ${idx + 1}`} className="rounded border px-3 py-2 text-sm text-black" value={item.href} onChange={(e) => setFooterLinks((prev) => prev.map((row, rowIdx) => (rowIdx === idx ? { ...row, href: e.target.value } : row)))} />
              <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => setFooterLinks((prev) => prev.filter((_, i) => i !== idx))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="mt-3 rounded border px-3 py-2 text-sm" onClick={() => setFooterLinks((prev) => [...prev, emptyLinkItem()])}>
            Add footer link
          </button>
        </section>

        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <p className="text-sm font-medium">Legal and trust links</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input aria-label="Legal privacy" className="rounded border px-3 py-2 text-sm text-black" value={legalPrivacy} onChange={(e) => setLegalPrivacy(e.target.value)} />
            <input aria-label="Legal terms" className="rounded border px-3 py-2 text-sm text-black" value={legalTerms} onChange={(e) => setLegalTerms(e.target.value)} />
            <input aria-label="Legal code of conduct" className="rounded border px-3 py-2 text-sm text-black" value={legalCodeOfConduct} onChange={(e) => setLegalCodeOfConduct(e.target.value)} />
            <input aria-label="Trust center link" className="rounded border px-3 py-2 text-sm text-black" value={trustCenter} onChange={(e) => setTrustCenter(e.target.value)} />
            <input aria-label="Trust transparency link" className="rounded border px-3 py-2 text-sm text-black" value={trustTransparency} onChange={(e) => setTrustTransparency(e.target.value)} />
            <input aria-label="Trust archive link" className="rounded border px-3 py-2 text-sm text-black" value={trustArchive} onChange={(e) => setTrustArchive(e.target.value)} />
          </div>
        </section>

        <section className="rounded-xl border border-[color:rgba(246,212,203,0.2)] p-4">
          <p className="text-sm font-medium">Public contact metadata</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <input aria-label="Contact email" className="rounded border px-3 py-2 text-sm text-black" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <input aria-label="Contact URL" className="rounded border px-3 py-2 text-sm text-black" value={contactUrl} onChange={(e) => setContactUrl(e.target.value)} />
            <input aria-label="Location label" className="rounded border px-3 py-2 text-sm text-black" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} />
          </div>
        </section>

        {conflictNotice ? <p className="text-sm text-amber-200">{conflictNotice}</p> : null}
        {publishNotice ? <p className="text-sm text-emerald-300">{publishNotice}</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {validationDetails ? (
          <pre className="overflow-x-auto rounded bg-[color:rgba(0,0,0,0.35)] p-3 text-xs text-[color:rgba(246,212,203,0.9)]">
            {JSON.stringify(validationDetails, null, 2)}
          </pre>
        ) : null}

        <div className="flex gap-3">
          <button type="submit" disabled={saving || publishing} className="rounded bg-[var(--color-foreground)] px-4 py-2 text-sm text-black disabled:opacity-60">
            {saving ? 'Saving draft…' : 'Save draft'}
          </button>
          <button
            type="button"
            disabled={publishing || saving}
            onClick={() => void handlePublishDraft()}
            className="rounded border border-emerald-400 px-4 py-2 text-sm text-emerald-200 disabled:opacity-60"
          >
            {publishing ? 'Publishing…' : 'Publish draft'}
          </button>
          <Link href="/control/tenants" className="rounded border px-4 py-2 text-sm">
            Back
          </Link>
        </div>

        <p className="text-xs text-[color:rgba(246,212,203,0.72)]">
          Read-only: canonical domains {payload?.read_only.canonical_domains.join(', ') || '—'} · preview host {payload?.read_only.preview_host || '—'}
        </p>
      </form>
    </div>
  );
}
