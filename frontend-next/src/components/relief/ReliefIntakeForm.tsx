"use client";

import React, { useState } from "react";
import { reliefApi } from "@/lib/api/endpoints";

export default function ReliefIntakeForm() {
  const urgencyOptions = ['low', 'medium', 'high'] as const;
  const [amount, setAmount] = useState(25000);
  const [purpose, setPurpose] = useState("rent");
  const [urgency, setUrgency] = useState<typeof urgencyOptions[number]>("medium");
  const [description, setDescription] = useState("");
  const [consentData, setConsentData] = useState(true);
  const [consentContact, setConsentContact] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit relief request.";
      setError(message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 bg-card border border-border rounded-xl p-6">
      <div>
        <h2 className="text-xl font-semibold">Relief Request</h2>
        <p className="text-sm text-muted-foreground">Private, consent-based review by micro-councils and case workers.</p>
      </div>
      <label className="block">
        <span className="text-sm text-muted-foreground">Amount requested (cents)</span>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full mt-1 px-3 py-2 border border-border rounded-lg"
        />
      </label>
      <label className="block">
        <span className="text-sm text-muted-foreground">Purpose</span>
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-border rounded-lg"
        >
          <option value="food">Food</option>
          <option value="rent">Rent</option>
          <option value="utilities">Utilities</option>
          <option value="medical">Medical</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-muted-foreground">Urgency</span>
        <select
          value={urgency}
          onChange={(e) => {
            const value = e.target.value as typeof urgencyOptions[number];
            if (urgencyOptions.includes(value)) {
              setUrgency(value);
            }
          }}
          className="w-full mt-1 px-3 py-2 border border-border rounded-lg"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-muted-foreground">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-border rounded-lg"
          rows={4}
        />
      </label>
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={consentData} onChange={() => setConsentData(!consentData)} />
          I consent to data processing for relief review.
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={consentContact} onChange={() => setConsentContact(!consentContact)} />
          I consent to contact from a case worker.
        </label>
      </div>
      <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Submit request</button>
      {status && <p className="text-sm text-emerald-700">{status}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
