'use client';

import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { getAnonymousPresenceSessionId, submitPresenceEnquiry } from '@/lib/api/presence';

interface PresenceEnquiryFormProps {
  slug: string;
  displayName: string;
  tone?: 'dark' | 'light';
}

export function PresenceEnquiryForm({ slug, displayName, tone = 'dark' }: PresenceEnquiryFormProps) {
  const [startedAt] = useState(() => Date.now());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredContactMethod, setPreferredContactMethod] = useState('email');
  const [enquiryType, setEnquiryType] = useState('general');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return name.trim() && email.trim() && message.trim() && consent && status !== 'submitting';
  }, [consent, email, message, name, status]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Name, email, and message are required.');
      setStatus('error');
      return;
    }
    if (!consent) {
      setError('Consent is required before sending.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    try {
      await submitPresenceEnquiry(slug, {
        enquiry_type: enquiryType,
        name,
        email,
        phone,
        preferred_contact_method: preferredContactMethod,
        message,
        consent,
        website,
        form_started_at: startedAt,
        source_url: typeof window !== 'undefined' ? window.location.pathname : `/p/${slug}`,
        source_code: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('nfc') || new URLSearchParams(window.location.search).get('source') || undefined : undefined,
        anonymous_session_id: getAnonymousPresenceSessionId(),
      });
      setStatus('success');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setConsent(false);
    } catch (submitError) {
      setStatus('error');
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit enquiry.');
    }
  };

  if (status === 'success') {
    const successText = tone === 'light' ? 'text-stone-900' : 'text-white';
    const successSubtext = tone === 'light' ? 'text-stone-700' : 'text-white/78';
    return (
      <div className="rounded-lg border border-[color:rgba(34,197,94,0.38)] bg-[color:rgba(34,197,94,0.12)] p-4">
        <h2 className={`text-base font-semibold ${successText}`}>Enquiry sent</h2>
        <p className={`mt-2 text-sm leading-6 ${successSubtext}`}>
          Your message has been recorded for {displayName}. Keep an eye on your preferred contact method.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className={tone === 'light' ? 'mt-4 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100' : 'mt-4 rounded-md border border-white/24 px-3 py-2 text-sm font-medium text-white hover:bg-white/10'}
        >
          Send another
        </button>
      </div>
    );
  }

  const labelClass = tone === 'light' ? 'space-y-2 text-sm text-stone-700' : 'space-y-2 text-sm text-white/80';
  const inputClass =
    tone === 'light'
      ? 'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-[#9f5f31]'
      : 'w-full rounded-md border border-white/18 bg-white/[0.08] px-3 py-2 text-sm text-white outline-none focus:border-[#e0b115]';
  const selectClass =
    tone === 'light'
      ? 'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-[#9f5f31]'
      : 'w-full rounded-md border border-white/18 bg-[#281030] px-3 py-2 text-sm text-white outline-none focus:border-[#e0b115]';
  const consentClass =
    tone === 'light'
      ? 'flex items-start gap-3 rounded-md border border-stone-300 bg-stone-50 p-3 text-sm leading-6 text-stone-700'
      : 'flex items-start gap-3 rounded-md border border-white/12 bg-white/[0.05] p-3 text-sm leading-6 text-white/78';
  const errorClass = tone === 'light' ? 'text-sm text-red-700' : 'text-sm text-red-200';

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
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            autoComplete="name"
          />
        </label>
        <label className={labelClass}>
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            autoComplete="email"
            inputMode="email"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Phone
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
            autoComplete="tel"
          />
        </label>
        <label className={labelClass}>
          Contact method
          <select
            value={preferredContactMethod}
            onChange={(event) => setPreferredContactMethod(event.target.value)}
            className={selectClass}
          >
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="sms">SMS</option>
          </select>
        </label>
      </div>

      <label className={labelClass}>
        Enquiry type
        <select
          value={enquiryType}
          onChange={(event) => setEnquiryType(event.target.value)}
          className={selectClass}
        >
          <option value="general">General enquiry</option>
          <option value="booking">Booking</option>
          <option value="collaboration">Collaboration</option>
          <option value="media">Media or portfolio</option>
        </select>
      </label>

      <label className={labelClass}>
        Message
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={`${inputClass} min-h-32`}
        />
      </label>

      <label className={consentClass}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>I consent to this enquiry being stored and shared with the node owner for follow-up.</span>
      </label>

      {error ? <p className={errorClass}>{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#e0b115] px-4 py-3 text-sm font-semibold text-[#1e0227] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
      >
        <Send className="h-4 w-4" />
        {status === 'submitting' ? 'Sending...' : 'Send enquiry'}
      </button>
    </form>
  );
}
