"use client";

import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { submitPeachContribution, type PeachContributionSubmission } from '@/lib/api/peach';
import type { PeachField } from '@/lib/peach/types';

const initialSubmission: PeachContributionSubmission = {
  adultOnly: false,
  contributionType: 'text_reflection',
  body: '',
  contributorChosenCredit: '',
  contactMethod: '',
  visibilityPreference: 'private',
  creditPreference: 'chosen_name',
  consentLevel: 'private_to_stewards',
  permissionForYield: false,
  sensitiveMaterialFlag: false,
  youthMaterialFlag: false,
  acceptedTerms: false,
};

const inputClass = 'mt-2 w-full rounded-md border border-[#dfc8a8] bg-white px-3 py-2 text-sm text-[#24160f] outline-none transition focus:border-[#8a4f2f]';
const labelClass = 'text-sm font-semibold text-[#24160f]';
const helpClass = 'mt-2 text-xs leading-5 text-[#6b5647]';

export function PeachContributionForm({ field }: { field: PeachField }) {
  const [submission, setSubmission] = useState<PeachContributionSubmission>(initialSubmission);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  function updateSubmission<K extends keyof PeachContributionSubmission>(key: K, value: PeachContributionSubmission[K]) {
    setSubmission((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    try {
      const response = await submitPeachContribution(field.slug, submission);
      setSubmission(initialSubmission);
      setStatus('success');
      setMessage(`${response.message} Reference: ${response.contribution.id}.`);
    } catch (error) {
      setStatus('error');
      if (error instanceof ApiError) {
        setMessage(error.message);
        return;
      }
      setMessage('The contribution could not be submitted. Try again shortly.');
    }
  }

  const blockedBySafety = submission.sensitiveMaterialFlag || submission.youthMaterialFlag;

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-lg border border-[#dfc8a8] bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4f2f]">Private pilot intake</p>
        <h1 className="text-3xl font-semibold text-[#24160f]">Contribute to {field.title}</h1>
        <p className="text-sm leading-6 text-[#5f493b]">
          Private pilot intake is for trusted adults sharing non-sensitive text only. Submissions stay private, wait for steward review, and are never shown publicly from this form.
        </p>
      </div>

      <label className={labelClass}>
        Contribution type
        <select className={inputClass} value={submission.contributionType} onChange={(event) => updateSubmission('contributionType', event.target.value as PeachContributionSubmission['contributionType'])}>
          <option value="text_reflection">Text reflection</option>
          <option value="question">Question</option>
          <option value="memory">Memory</option>
          <option value="research_note">Research note</option>
          <option value="archive_fragment">Archive fragment</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label className={labelClass}>
        Contribution body
        <textarea
          className={`${inputClass} min-h-44 resize-y`}
          maxLength={5000}
          value={submission.body}
          onChange={(event) => updateSubmission('body', event.target.value)}
          required
        />
        <span className={helpClass}>Maximum 5000 characters. Do not include sensitive material or material involving children or young people.</span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Chosen credit
          <input className={inputClass} value={submission.contributorChosenCredit} onChange={(event) => updateSubmission('contributorChosenCredit', event.target.value)} required />
        </label>
        <label className={labelClass}>
          Contact method
          <input className={inputClass} value={submission.contactMethod} onChange={(event) => updateSubmission('contactMethod', event.target.value)} required />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>
          Visibility preference
          <select className={inputClass} value={submission.visibilityPreference} onChange={(event) => updateSubmission('visibilityPreference', event.target.value as PeachContributionSubmission['visibilityPreference'])}>
            <option value="private">Private to stewards</option>
            <option value="internal">Internal discussion</option>
            <option value="anonymous_public">Anonymous public if later approved</option>
            <option value="credited_public">Credited public if later approved</option>
            <option value="yield_only">Yield only if later approved</option>
            <option value="follow_up_required">Follow-up required</option>
          </select>
        </label>
        <label className={labelClass}>
          Credit preference
          <select className={inputClass} value={submission.creditPreference} onChange={(event) => updateSubmission('creditPreference', event.target.value as PeachContributionSubmission['creditPreference'])}>
            <option value="chosen_name">Chosen name</option>
            <option value="full_name">Full name</option>
            <option value="organization">Organization</option>
            <option value="pseudonym">Pseudonym</option>
            <option value="anonymous">Anonymous</option>
            <option value="credit_withheld">Credit withheld</option>
            <option value="follow_up_before_crediting">Follow up before crediting</option>
          </select>
        </label>
        <label className={labelClass}>
          Consent level
          <select className={inputClass} value={submission.consentLevel} onChange={(event) => updateSubmission('consentLevel', event.target.value as PeachContributionSubmission['consentLevel'])}>
            <option value="private_to_stewards">Private to stewards</option>
            <option value="internal_discussion">Internal discussion</option>
            <option value="anonymous_quote">Anonymous quote if later approved</option>
            <option value="public_credit">Public credit if later approved</option>
            <option value="yield_inclusion">Yield inclusion if later approved</option>
            <option value="follow_up_required">Follow-up required</option>
          </select>
        </label>
      </div>

      <div className="space-y-3 rounded-md border border-[#eadbc4] bg-[#fffaf2] p-4">
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={submission.adultOnly} onChange={(event) => updateSubmission('adultOnly', event.target.checked)} />
          I confirm I am an adult and this is non-sensitive private pilot material.
        </label>
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={submission.permissionForYield} onChange={(event) => updateSubmission('permissionForYield', event.target.checked)} />
          I permit this contribution to be considered for a possible later Field Yield, subject to steward review and a later consent check before any public use.
        </label>
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={submission.sensitiveMaterialFlag} onChange={(event) => updateSubmission('sensitiveMaterialFlag', event.target.checked)} />
          This includes sensitive material. The private pilot will reject this submission.
        </label>
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={submission.youthMaterialFlag} onChange={(event) => updateSubmission('youthMaterialFlag', event.target.checked)} />
          This includes or concerns a child or young person. The private pilot will reject this submission.
        </label>
        <label className="flex gap-3 text-sm text-[#24160f]">
          <input type="checkbox" checked={submission.acceptedTerms} onChange={(event) => updateSubmission('acceptedTerms', event.target.checked)} />
          I understand this is private, pending steward review, and not publicly displayed.
        </label>
      </div>

      {blockedBySafety ? (
        <p className="rounded-md border border-[#d49b7a] bg-[#fff2ec] p-3 text-sm text-[#7c2d12]">
          Sensitive or youth-related material is disabled for the private pilot. This submission will be rejected until safeguarding workflows exist.
        </p>
      ) : null}

      {message ? (
        <p className={`rounded-md border p-3 text-sm ${status === 'success' ? 'border-[#95b98d] bg-[#f0f8ee] text-[#24451d]' : 'border-[#d49b7a] bg-[#fff2ec] text-[#7c2d12]'}`}>
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={status === 'submitting'} className="rounded-md bg-[#24160f] px-4 py-2 text-sm font-semibold text-[#fff7ea] transition hover:bg-[#4a2b1d] disabled:opacity-60">
        {status === 'submitting' ? 'Submitting...' : 'Submit private contribution'}
      </button>
    </form>
  );
}
