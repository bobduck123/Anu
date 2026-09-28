"use client";

import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { submitPeachSupportIntent, type PeachSupportIntentSubmission } from '@/lib/api/peach';
import type { PeachField } from '@/lib/peach/types';

const initialIntent: PeachSupportIntentSubmission = {
  supportType: 'membership',
  supporterName: '',
  supporterContact: '',
  amountIntent: '',
  currency: 'AUD',
  note: '',
  paymentTaken: false,
  adultOnly: false,
  sensitiveMaterialFlag: false,
  youthMaterialFlag: false,
  acceptedTerms: false,
};

const inputClass = 'mt-2 w-full rounded-md border border-[#dfc8a8] bg-white px-3 py-2 text-sm text-[#24160f] outline-none transition focus:border-[#8a4f2f]';
const labelClass = 'text-sm font-semibold text-[#24160f]';

export function PeachSupportIntentForm({ field }: { field: PeachField }) {
  const [intent, setIntent] = useState<PeachSupportIntentSubmission>(initialIntent);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  function update<K extends keyof PeachSupportIntentSubmission>(key: K, value: PeachSupportIntentSubmission[K]) {
    setIntent((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    try {
      const response = await submitPeachSupportIntent(field.slug, { ...intent, paymentTaken: false });
      setIntent(initialIntent);
      setStatus('success');
      setMessage(`${response.supportIntent.message} Reference: ${response.supportIntent.id}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof ApiError ? error.message : 'The support intent could not be submitted.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-lg border border-[#dfc8a8] bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4f2f]">Manual support intent</p>
        <h1 className="text-3xl font-semibold text-[#24160f]">Support {field.title}</h1>
        <p className="text-sm leading-6 text-[#5f493b]">
          This records interest for manual follow-up only. No payment is taken here, no checkout opens, and PEACH does not run a cart or product grid.
        </p>
      </div>

      <label className={labelClass}>
        Support type
        <select className={inputClass} value={intent.supportType} onChange={(event) => update('supportType', event.target.value as PeachSupportIntentSubmission['supportType'])}>
          <option value="membership">Membership</option>
          <option value="one_off_support">One-off support</option>
          <option value="sponsor_access">Sponsor access</option>
          <option value="sponsor_field">Sponsor Field</option>
          <option value="sponsor_yield">Sponsor Yield</option>
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Supporter name
          <input className={inputClass} value={intent.supporterName} onChange={(event) => update('supporterName', event.target.value)} />
        </label>
        <label className={labelClass}>
          Contact method
          <input className={inputClass} value={intent.supporterContact} onChange={(event) => update('supporterContact', event.target.value)} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_0.4fr]">
        <label className={labelClass}>
          Amount intent, optional
          <input className={inputClass} value={intent.amountIntent} onChange={(event) => update('amountIntent', event.target.value)} />
        </label>
        <label className={labelClass}>
          Currency
          <input className={inputClass} value={intent.currency} onChange={(event) => update('currency', event.target.value.toUpperCase())} />
        </label>
      </div>

      <label className={labelClass}>
        Note
        <textarea className={`${inputClass} min-h-28 resize-y`} maxLength={2000} value={intent.note} onChange={(event) => update('note', event.target.value)} />
      </label>

      <div className="space-y-3 rounded-md border border-[#eadbc4] bg-[#fffaf2] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a4f2f]">Payment taken: false</p>
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={intent.adultOnly} onChange={(event) => update('adultOnly', event.target.checked)} />
          I confirm I am an adult and this support intent is non-sensitive.
        </label>
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={intent.sensitiveMaterialFlag} onChange={(event) => update('sensitiveMaterialFlag', event.target.checked)} />
          This includes sensitive material. The pilot will reject it.
        </label>
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={intent.youthMaterialFlag} onChange={(event) => update('youthMaterialFlag', event.target.checked)} />
          This includes or concerns a child or young person. The pilot will reject it.
        </label>
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={intent.acceptedTerms} onChange={(event) => update('acceptedTerms', event.target.checked)} />
          I understand this records manual support interest only and takes no payment.
        </label>
      </div>

      {message ? (
        <p className={`rounded-md border p-3 text-sm ${status === 'success' ? 'border-[#95b98d] bg-[#f0f8ee] text-[#24451d]' : 'border-[#d49b7a] bg-[#fff2ec] text-[#7c2d12]'}`}>
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={status === 'submitting'} className="rounded-md bg-[#24160f] px-4 py-2 text-sm font-semibold text-[#fff7ea] transition hover:bg-[#4a2b1d] disabled:opacity-60">
        {status === 'submitting' ? 'Submitting...' : 'Submit support intent'}
      </button>
    </form>
  );
}
