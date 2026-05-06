'use client';

import { useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { getAnonymousPresenceSessionId, submitPresenceQuoteRequest } from '@/lib/api/presence';

interface PresenceQuoteRequestFormProps {
  slug: string;
  displayName: string;
  tone?: 'dark' | 'light';
}

export function PresenceQuoteRequestForm({ slug, displayName, tone = 'dark' }: PresenceQuoteRequestFormProps) {
  const [startedAt] = useState(() => Date.now());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobType, setJobType] = useState('');
  const [addressSuburb, setAddressSuburb] = useState('');
  const [urgency, setUrgency] = useState('standard');
  const [preferredDate, setPreferredDate] = useState('');
  const [description, setDescription] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim() && email.trim() && description.trim() && consent && status !== 'submitting', [consent, description, email, name, status]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !description.trim()) {
      setStatus('error');
      setError('Name, email, and job description are required.');
      return;
    }
    if (!consent) {
      setStatus('error');
      setError('Consent is required before sending.');
      return;
    }
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    setStatus('submitting');
    try {
      await submitPresenceQuoteRequest(slug, {
        name,
        email,
        phone,
        job_type: jobType,
        address_suburb: addressSuburb,
        urgency,
        preferred_date: preferredDate,
        description,
        access_notes: accessNotes,
        budget_range: budgetRange,
        consent,
        website,
        form_started_at: startedAt,
        source_url: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : `/p/${slug}`,
        source_code: params?.get('nfc') || params?.get('source') || undefined,
        anonymous_session_id: getAnonymousPresenceSessionId(),
      });
      setStatus('success');
      setDescription('');
      setAccessNotes('');
      setConsent(false);
    } catch (submitError) {
      setStatus('error');
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit quote request.');
    }
  };

  const labelClass = tone === 'light' ? 'space-y-2 text-sm text-stone-700' : 'space-y-2 text-sm text-white/80';
  const inputClass =
    tone === 'light'
      ? 'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-[#9f5f31]'
      : 'w-full rounded-md border border-white/18 bg-white/[0.08] px-3 py-2 text-sm text-white outline-none focus:border-[#e0b115]';
  const selectClass =
    tone === 'light'
      ? 'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-[#9f5f31]'
      : 'w-full rounded-md border border-white/18 bg-[#281030] px-3 py-2 text-sm text-white outline-none focus:border-[#e0b115]';

  if (status === 'success') {
    return (
      <div className="rounded-lg border border-[color:rgba(34,197,94,0.38)] bg-[color:rgba(34,197,94,0.12)] p-4">
        <h2 className={tone === 'light' ? 'text-base font-semibold text-stone-900' : 'text-base font-semibold text-white'}>Quote request sent</h2>
        <p className={tone === 'light' ? 'mt-2 text-sm leading-6 text-stone-700' : 'mt-2 text-sm leading-6 text-white/78'}>
          Your request has been recorded for {displayName}. The owner can now see it in their relationship ledger.
        </p>
        <button type="button" onClick={() => setStatus('idle')} className={tone === 'light' ? 'mt-4 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100' : 'mt-4 rounded-md border border-white/24 px-3 py-2 text-sm font-medium text-white hover:bg-white/10'}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} autoComplete="name" />
        </label>
        <label className={labelClass}>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} autoComplete="email" inputMode="email" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Phone
          <input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} autoComplete="tel" />
        </label>
        <label className={labelClass}>
          Job type
          <input value={jobType} onChange={(event) => setJobType(event.target.value)} className={inputClass} placeholder="Repairs, install, quote..." />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Suburb or area
          <input value={addressSuburb} onChange={(event) => setAddressSuburb(event.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          Urgency
          <select value={urgency} onChange={(event) => setUrgency(event.target.value)} className={selectClass}>
            <option value="standard">Standard</option>
            <option value="soon">Soon</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Preferred date
          <input value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          Budget range
          <input value={budgetRange} onChange={(event) => setBudgetRange(event.target.value)} className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        Job description
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClass} min-h-28`} />
      </label>
      <label className={labelClass}>
        Access notes
        <textarea value={accessNotes} onChange={(event) => setAccessNotes(event.target.value)} className={`${inputClass} min-h-20`} />
      </label>
      <label className={tone === 'light' ? 'flex items-start gap-3 rounded-md border border-stone-300 bg-stone-50 p-3 text-sm leading-6 text-stone-700' : 'flex items-start gap-3 rounded-md border border-white/12 bg-white/[0.05] p-3 text-sm leading-6 text-white/78'}>
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4" />
        <span>I consent to this quote request being stored and shared with the node owner for follow-up.</span>
      </label>
      {error ? <p className={tone === 'light' ? 'text-sm text-red-700' : 'text-sm text-red-200'}>{error}</p> : null}
      <button type="submit" disabled={!canSubmit} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#e0b115] px-4 py-3 text-sm font-semibold text-[#1e0227] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto">
        <ClipboardCheck className="h-4 w-4" />
        {status === 'submitting' ? 'Sending...' : 'Request quote'}
      </button>
    </form>
  );
}
