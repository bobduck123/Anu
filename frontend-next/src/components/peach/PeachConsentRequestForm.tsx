"use client";

import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { submitPeachConsentOperationRequest, type PeachConsentOperationSubmission } from '@/lib/api/peach';

const initialRequest: PeachConsentOperationSubmission = {
  operationType: 'export',
  contributionId: '',
  contributorContact: '',
  contributorCreditOrName: '',
  requestDetail: '',
  adultOnly: false,
  sensitiveMaterialFlag: false,
  youthMaterialFlag: false,
  acceptedTerms: false,
};

const inputClass = 'mt-2 w-full rounded-md border border-[#dfc8a8] bg-white px-3 py-2 text-sm text-[#24160f] outline-none transition focus:border-[#8a4f2f]';
const labelClass = 'text-sm font-semibold text-[#24160f]';

export function PeachConsentRequestForm() {
  const [request, setRequest] = useState<PeachConsentOperationSubmission>(initialRequest);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  function update<K extends keyof PeachConsentOperationSubmission>(key: K, value: PeachConsentOperationSubmission[K]) {
    setRequest((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    try {
      const payload = {
        ...request,
        contributionId: request.contributionId === '' ? undefined : request.contributionId,
      };
      const response = await submitPeachConsentOperationRequest(payload);
      setRequest(initialRequest);
      setStatus('success');
      setMessage(`${response.consentOperationRequest.message} Reference: ${response.consentOperationRequest.id}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof ApiError ? error.message : 'The consent request could not be submitted.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-lg border border-[#dfc8a8] bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4f2f]">Consent operations</p>
        <h1 className="text-3xl font-semibold text-[#24160f]">Request export or withdrawal review</h1>
        <p className="text-sm leading-6 text-[#5f493b]">
          Requests go to manual steward review. There is no automatic deletion, public contribution display is disabled, and responses may be manual during the adult-only non-sensitive pilot.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Request type
          <select className={inputClass} value={request.operationType} onChange={(event) => update('operationType', event.target.value as PeachConsentOperationSubmission['operationType'])}>
            <option value="export">Export request</option>
            <option value="withdrawal">Withdrawal request</option>
          </select>
        </label>
        <label className={labelClass}>
          Contribution reference, if known
          <input className={inputClass} inputMode="numeric" value={request.contributionId} onChange={(event) => update('contributionId', event.target.value ? Number(event.target.value) : '')} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Contact method
          <input className={inputClass} value={request.contributorContact} onChange={(event) => update('contributorContact', event.target.value)} required />
        </label>
        <label className={labelClass}>
          Credit or name used
          <input className={inputClass} value={request.contributorCreditOrName} onChange={(event) => update('contributorCreditOrName', event.target.value)} required />
        </label>
      </div>

      <label className={labelClass}>
        Request detail
        <textarea className={`${inputClass} min-h-32 resize-y`} maxLength={2000} value={request.requestDetail} onChange={(event) => update('requestDetail', event.target.value)} required />
      </label>

      <div className="space-y-3 rounded-md border border-[#eadbc4] bg-[#fffaf2] p-4">
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={request.adultOnly} onChange={(event) => update('adultOnly', event.target.checked)} />
          I confirm I am an adult and this request concerns non-sensitive pilot material.
        </label>
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={request.sensitiveMaterialFlag} onChange={(event) => update('sensitiveMaterialFlag', event.target.checked)} />
          This request includes sensitive material. The pilot will reject it.
        </label>
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={request.youthMaterialFlag} onChange={(event) => update('youthMaterialFlag', event.target.checked)} />
          This request includes or concerns a child or young person. The pilot will reject it.
        </label>
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={request.acceptedTerms} onChange={(event) => update('acceptedTerms', event.target.checked)} />
          I understand this creates a manual steward-review request, not automatic deletion or export.
        </label>
      </div>

      {message ? (
        <p className={`rounded-md border p-3 text-sm ${status === 'success' ? 'border-[#95b98d] bg-[#f0f8ee] text-[#24451d]' : 'border-[#d49b7a] bg-[#fff2ec] text-[#7c2d12]'}`}>
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={status === 'submitting'} className="rounded-md bg-[#24160f] px-4 py-2 text-sm font-semibold text-[#fff7ea] transition hover:bg-[#4a2b1d] disabled:opacity-60">
        {status === 'submitting' ? 'Submitting...' : 'Submit consent request'}
      </button>
    </form>
  );
}
