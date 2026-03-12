"use client";

import { useEffect, useState } from "react";
import ReliefIntakeForm from "@/components/relief/ReliefIntakeForm";
import { reliefApi, type ReliefRequestRecord } from "@/lib/api/endpoints";

export default function ReliefPage() {
  const [requests, setRequests] = useState<ReliefRequestRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reliefApi.myRequests()
      .then(setRequests)
      .catch((err) => setError(err.message || "Failed to load requests"));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <header>
          <h1 className="text-3xl font-serif font-semibold">Relief</h1>
          <p className="text-sm text-muted-foreground">Request support with clear, consent-based processing.</p>
        </header>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ReliefIntakeForm />
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your Requests</h2>
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="border border-border rounded-lg p-4 bg-card text-sm">
                <div className="flex items-center justify-between">
                  <span>#{req.id}</span>
                  <span className="capitalize">{req.status}</span>
                </div>
                <p className="text-muted-foreground mt-1">Amount: ${(req.amount_requested_cents / 100).toFixed(2)}</p>
                <p className="text-muted-foreground">Purpose: {req.purpose}</p>
              </div>
            ))}
            {!requests.length && <p className="text-sm text-muted-foreground">No requests yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
