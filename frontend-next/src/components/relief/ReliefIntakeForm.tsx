"use client";

import React, { useState } from "react";
import { HeartHandshake, ShieldCheck } from "lucide-react";
import { reliefApi } from "@/lib/api/endpoints";
import {
  AnuChip,
  AnuControlButton,
  AnuSectionHeading,
  AnuSurfacePanel,
} from "@/ui-system/anu/surfacePrimitives";

const fieldClass =
  "mt-1.5 w-full rounded-2xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.03)] px-3.5 py-3 text-sm text-[var(--color-foreground)] placeholder:text-[color:rgba(246,212,203,0.75)] focus:border-[rgba(246,212,203,0.44)] focus:outline-none focus:ring-1 focus:ring-[rgba(246,212,203,0.24)]";

export default function ReliefIntakeForm() {
  const urgencyOptions = ["low", "medium", "high"] as const;
  const [amount, setAmount] = useState(25000);
  const [purpose, setPurpose] = useState("rent");
  const [urgency, setUrgency] = useState<typeof urgencyOptions[number]>("medium");
  const [description, setDescription] = useState("");
  const [consentData, setConsentData] = useState(true);
  const [consentContact, setConsentContact] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setSubmitting(true);
    try {
      const res = await reliefApi.createRequest({
        amount_requested: amount,
        purpose,
        description,
        urgency,
        contact_preference: "in-app",
        consents: { data_processing: consentData, case_worker_contact: consentContact },
      });
      setStatus(`Submitted. Queue position ~${res.queue_position_estimate}.`);
      setDescription("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit relief request.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnuSurfacePanel tone="soft" className="p-5 md:p-6">
      <div className="flex flex-wrap gap-2">
        <AnuChip tone="signal" icon={HeartHandshake}>
          Private intake
        </AnuChip>
        <AnuChip tone="muted" icon={ShieldCheck}>
          Consent-based review
        </AnuChip>
      </div>

      <div className="mt-4">
        <AnuSectionHeading
          eyebrow="Relief request"
          title="Start a care request"
          description="Requests are reviewed through private, consent-based handling. Submit only the information needed to assess the request fairly and route follow-up safely."
        />
      </div>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm text-[color:rgba(246,212,203,0.82)]">Amount requested (cents)</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="text-sm text-[color:rgba(246,212,203,0.82)]">Purpose</span>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={fieldClass}
            >
              <option value="food">Food</option>
              <option value="rent">Rent</option>
              <option value="utilities">Utilities</option>
              <option value="medical">Medical</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-[color:rgba(246,212,203,0.82)]">Urgency</span>
          <select
            value={urgency}
            onChange={(e) => {
              const value = e.target.value as typeof urgencyOptions[number];
              if (urgencyOptions.includes(value)) {
                setUrgency(value);
              }
            }}
            className={fieldClass}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-[color:rgba(246,212,203,0.82)]">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${fieldClass} min-h-32 resize-y`}
            rows={5}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-4 py-4 text-sm text-[color:rgba(246,212,203,0.86)]">
            <input
              type="checkbox"
              checked={consentData}
              onChange={() => setConsentData(!consentData)}
              className="mt-1"
            />
            <span>I consent to data processing for relief review.</span>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-4 py-4 text-sm text-[color:rgba(246,212,203,0.86)]">
            <input
              type="checkbox"
              checked={consentContact}
              onChange={() => setConsentContact(!consentContact)}
              className="mt-1"
            />
            <span>I consent to contact from a case worker.</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AnuControlButton type="submit" tone="active" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit request"}
          </AnuControlButton>
          <p className="text-xs text-[color:rgba(246,212,203,0.64)]">
            Queue position and next-step visibility appear after submission.
          </p>
        </div>

        {status ? <p className="text-sm text-[#665700]">{status}</p> : null}
        {error ? <p className="text-sm text-[#e0b115]">{error}</p> : null}
      </form>
    </AnuSurfacePanel>
  );
}
