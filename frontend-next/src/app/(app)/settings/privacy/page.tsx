"use client";

import { useEffect, useState } from "react";
import { consentApi } from "@/lib/api/endpoints";

export default function PrivacySettingsPage() {
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    consentApi.get()
      .then((res) => setConsents(res.consents))
      .catch(() => setConsents({}));
  }, []);

  const toggle = (key: string) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    const res = await consentApi.update(consents);
    setConsents(res.consents);
    setStatus("Saved.");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <header>
          <h1 className="text-3xl font-serif font-semibold">Privacy Settings</h1>
          <p className="text-sm text-muted-foreground">Control how your data is used. No ads, no resale.</p>
        </header>
        <div className="space-y-4 border border-border rounded-xl p-6 bg-card">
          {["analytics", "data_coop", "recognition"].map((key) => (
            <label key={key} className="flex items-center justify-between">
              <span className="capitalize">{key.replace("_", " ")}</span>
              <input type="checkbox" checked={!!consents[key]} onChange={() => toggle(key)} />
            </label>
          ))}
          <button onClick={save} className="bg-emerald-600 text-white px-4 py-2 rounded-lg w-fit">
            Save
          </button>
          {status && <p className="text-sm text-emerald-700">{status}</p>}
        </div>
      </div>
    </div>
  );
}
