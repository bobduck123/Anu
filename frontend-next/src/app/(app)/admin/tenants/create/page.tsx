'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Check, Globe, Palette, Shield, Settings, Key } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { Card, CardTitle } from '@/ui-system/primitives/Card';
import { Button } from '@/ui-system/primitives/Button';
import { FormField, Input, Select, Checkbox } from '@/ui-system/primitives/Form';
import { SuccessState } from '@/ui-system/states/SuccessState';

type Step = 'basics' | 'modules' | 'data-policy' | 'branding' | 'domain' | 'encryption' | 'confirm';

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'basics', label: 'Basics', icon: Globe },
  { key: 'modules', label: 'Modules', icon: Settings },
  { key: 'data-policy', label: 'Data Policy', icon: Shield },
  { key: 'branding', label: 'Branding', icon: Palette },
  { key: 'domain', label: 'Domain', icon: Globe },
  { key: 'encryption', label: 'Encryption', icon: Key },
  { key: 'confirm', label: 'Confirm', icon: Check },
];

const DEFAULT_MODULES: Record<string, boolean> = {
  marketplace: true,
  calendar: true,
  education: true,
  community: true,
  costLowering: true,
  impact: true,
  relief: true,
  governance: false,
};

export default function CreateTenantPage() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('active');
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [dataPolicy, setDataPolicy] = useState(0);
  const [primaryColor, setPrimaryColor] = useState('#1e3a5f');
  const [secondaryColor, setSecondaryColor] = useState('#d4c4b7');
  const [logoUrl, setLogoUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [encKey, setEncKey] = useState('');

  const step = STEPS[stepIdx].key;

  const generateEncKey = () => {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    setEncKey(Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join(''));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiFetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
          status,
          modules,
          data_policy: dataPolicy,
          branding: { primary_color: primaryColor, secondary_color: secondaryColor, logo: logoUrl },
          domain: domain || undefined,
        }),
      });
      setSuccess(true);
    } catch {
      alert('Failed to provision tenant. The endpoint may not exist yet — check backend.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <SuccessState
          title="Tenant Provisioned!"
          message={`${name} has been created successfully.`}
          actionLabel="View Tenants"
          onAction={() => router.push('/admin/tenants')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.push('/admin/tenants')}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Tenants
      </button>

      <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-serif)' }}>
        Provision Tenant
      </h1>

      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === stepIdx;
          const isDone = i < stepIdx;
          return (
            <div key={s.key} className="flex items-center">
              <button
                onClick={() => i < stepIdx && setStepIdx(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : isDone
                    ? 'bg-[var(--color-sage-light)] text-[var(--color-forest)] cursor-pointer'
                    : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-[var(--color-border)] mx-1" />}
            </div>
          );
        })}
      </div>

      <Card padding="lg">
        {/* Step 1: Basics */}
        {step === 'basics' && (
          <div className="space-y-4">
            <CardTitle>Tenant Details</CardTitle>
            <FormField label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Addi, FBI, Mudyin" />
            </FormField>
            <FormField label="Slug" hint="URL-safe identifier. Auto-generated if blank.">
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="addi" />
            </FormField>
            <FormField label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="provisioning">Provisioning</option>
                <option value="suspended">Suspended</option>
              </Select>
            </FormField>
          </div>
        )}

        {/* Step 2: Modules */}
        {step === 'modules' && (
          <div className="space-y-4">
            <CardTitle>Module Toggles</CardTitle>
            <p className="text-sm text-[var(--color-muted-foreground)]">Enable or disable platform modules for this tenant.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {Object.entries(modules).map(([key, enabled]) => (
                <Checkbox
                  key={key}
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  checked={enabled}
                  onChange={(e) => setModules((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Data Policy */}
        {step === 'data-policy' && (
          <div className="space-y-4">
            <CardTitle>Data Sovereignty Level</CardTitle>
            <p className="text-sm text-[var(--color-muted-foreground)]">Choose how strictly data is isolated for this tenant.</p>
            <div className="space-y-3 mt-4">
              {[
                { level: 0, label: 'Level 0 — Shared', desc: 'Data stored in shared database tables. Tenant ID column separation.' },
                { level: 1, label: 'Level 1 — Schema Isolated', desc: 'Separate database schema per tenant. Shared infrastructure.' },
                { level: 2, label: 'Level 2 — DB Isolated', desc: 'Dedicated database per tenant. Shared compute.' },
                { level: 3, label: 'Level 3 — Full Isolation', desc: 'Dedicated database, compute, and encryption keys.' },
              ].map((opt) => (
                <Card
                  key={opt.level}
                  padding="md"
                  hover
                  className={`cursor-pointer ${dataPolicy === opt.level ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
                  onClick={() => setDataPolicy(opt.level)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">{opt.desc}</p>
                    </div>
                    {dataPolicy === opt.level && <Check className="w-5 h-5 text-[var(--color-primary)]" />}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Branding */}
        {step === 'branding' && (
          <div className="space-y-4">
            <CardTitle>Branding</CardTitle>
            <FormField label="Logo URL">
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Primary Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-[var(--color-border)]"
                  />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
                </div>
              </FormField>
              <FormField label="Secondary Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-[var(--color-border)]"
                  />
                  <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1" />
                </div>
              </FormField>
            </div>
            {/* Preview */}
            <div className="mt-4 p-4 rounded-lg border border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-muted-foreground)] mb-2">Preview</p>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <Image src={logoUrl} alt="logo" width={32} height={32} unoptimized className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: primaryColor }} />
                )}
                <span className="font-semibold" style={{ color: primaryColor, fontFamily: 'var(--font-serif)' }}>
                  {name || 'Tenant Name'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Domain */}
        {step === 'domain' && (
          <div className="space-y-4">
            <CardTitle>Custom Domain</CardTitle>
            <p className="text-sm text-[var(--color-muted-foreground)]">Optionally map a custom domain to this tenant.</p>
            <FormField label="Domain" hint="e.g. commons.addi.org.au">
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="commons.example.org" />
            </FormField>
          </div>
        )}

        {/* Step 6: Encryption */}
        {step === 'encryption' && (
          <div className="space-y-4">
            <CardTitle>Encryption Key</CardTitle>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Generate a client-side encryption key for this tenant. This key is used for at-rest encryption of sensitive data.
            </p>
            <div className="flex items-center gap-3">
              <Input value={encKey} readOnly placeholder="Click Generate to create a key" className="flex-1 font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={generateEncKey}>Generate</Button>
            </div>
            {encKey && (
              <p className="text-xs text-[var(--color-sage)]">Key generated. Store this securely — it cannot be recovered.</p>
            )}
          </div>
        )}

        {/* Step 7: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <CardTitle>Confirm Provisioning</CardTitle>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-muted-foreground)]">Name</span>
                <span className="font-medium">{name || '--'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-muted-foreground)]">Slug</span>
                <span className="font-medium">{slug || name.toLowerCase().replace(/\s+/g, '-') || '--'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-muted-foreground)]">Status</span>
                <span className="font-medium capitalize">{status}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-muted-foreground)]">Modules</span>
                <span className="font-medium">{Object.entries(modules).filter(([, v]) => v).map(([k]) => k).join(', ')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-muted-foreground)]">Data Policy</span>
                <span className="font-medium">Level {dataPolicy}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-muted-foreground)]">Primary Color</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: primaryColor }} />
                  <span className="font-mono text-xs">{primaryColor}</span>
                </div>
              </div>
              {domain && (
                <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-muted-foreground)]">Domain</span>
                  <span className="font-medium">{domain}</span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-[var(--color-muted-foreground)]">Encryption</span>
                <span className="font-medium">{encKey ? 'Key generated' : 'None'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-border)]">
          <Button
            variant="outline"
            icon={ArrowLeft}
            onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
            disabled={stepIdx === 0}
          >
            Back
          </Button>
          {stepIdx < STEPS.length - 1 ? (
            <Button
              variant="primary"
              iconRight={ArrowRight}
              onClick={() => setStepIdx(stepIdx + 1)}
              disabled={step === 'basics' && !name.trim()}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={Check}
              loading={submitting}
              onClick={handleSubmit}
              disabled={!name.trim()}
            >
              Provision Tenant
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
