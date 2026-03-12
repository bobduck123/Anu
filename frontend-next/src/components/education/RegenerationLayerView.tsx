"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { RegenerationLog, RegenerationUnlock, educationStackApi } from "@/lib/api/educationStack";

const VERIFIER_ROLES = new Set([
  "verifier",
  "validator",
  "node_admin",
  "platform_admin",
  "indigenous_council",
  "node_curator",
  "board_member",
  "auditor",
  "treasury_guardian",
]);

export function RegenerationLayerView() {
  const { user } = useAuth();
  const canVerify = useMemo(() => VERIFIER_ROLES.has(user?.role || ""), [user?.role]);
  const [unlocks, setUnlocks] = useState<RegenerationUnlock[]>([]);
  const [logs, setLogs] = useState<RegenerationLog[]>([]);
  const [processingLinkId, setProcessingLinkId] = useState<number | null>(null);
  const [processingLogId, setProcessingLogId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unlockResponse, logResponse] = await Promise.all([
        educationStackApi.listRegenerationUnlocks(),
        educationStackApi.listRegenerationLogs(),
      ]);
      setUnlocks(unlockResponse.unlocks);
      setLogs(logResponse.logs);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Unable to load regeneration data.";
      setMessage(messageText);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const logCompletion = async (unlock: RegenerationUnlock) => {
    setProcessingLinkId(unlock.regeneration_link_id);
    setMessage(null);
    try {
      const result = await educationStackApi.createRegenerationLog({
        regeneration_link_id: unlock.regeneration_link_id,
        completion_status: "completed",
        proof_note: "Knowledge-linked regenerative action completed.",
      });
      setMessage(
        result.requires_verification
          ? "Action logged. Awaiting verifier confirmation."
          : "Action logged and completed.",
      );
      await loadData();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Unable to log completion.";
      setMessage(messageText);
    } finally {
      setProcessingLinkId(null);
    }
  };

  const verifyLog = async (logId: number) => {
    setProcessingLogId(logId);
    setMessage(null);
    try {
      await educationStackApi.verifyRegenerationLog(logId);
      setMessage("Regeneration log verified.");
      await loadData();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Unable to verify log.";
      setMessage(messageText);
    } finally {
      setProcessingLogId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-4xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            Regeneration Layer
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Module completion unlocks grounded, real-world regenerative actions tied to existing actions infrastructure.
          </p>
          {message && <p className="mt-3 text-sm text-[var(--color-institutional)]">{message}</p>}
        </header>

        <section className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="mb-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            Unlocked Actions
          </h2>
          {loading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Loading unlocks...</p>
          ) : unlocks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No regeneration links have been configured yet.</p>
          ) : (
            <div className="space-y-3">
              {unlocks.map((unlock) => (
                <article key={unlock.regeneration_link_id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{unlock.action_title}</h3>
                    <span className="rounded-full bg-[var(--color-sage-light)] px-2 py-0.5 text-[10px] text-[var(--color-forest)]">
                      {unlock.action_category.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Progress {unlock.progress_value}% / unlock threshold {unlock.unlock_threshold}%
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-earth-dark)]">{unlock.cultural_guidance || "Follow local custodial guidance before execution."}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      Status: {unlock.completion_status || (unlock.unlocked ? "ready" : "locked")}
                    </span>
                    <button
                      type="button"
                      disabled={!unlock.unlocked || processingLinkId === unlock.regeneration_link_id}
                      onClick={() => logCompletion(unlock)}
                      className="btn-pill btn-pill-primary text-xs disabled:opacity-60"
                    >
                      {processingLinkId === unlock.regeneration_link_id ? "Logging..." : "Log Completion"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h2 className="mb-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            Action Log
          </h2>
          {logs.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No regeneration logs submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <article key={log.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">Log #{log.id}</p>
                    <span className="text-xs text-[var(--color-muted-foreground)]">{log.completion_status}</span>
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Completed: {log.completed_at ? new Date(log.completed_at).toLocaleString() : "not completed"}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Verified: {log.verified_at ? new Date(log.verified_at).toLocaleString() : "pending"}
                  </p>
                  {canVerify && log.completion_status !== "verified" && (
                    <button
                      type="button"
                      onClick={() => verifyLog(log.id)}
                      disabled={processingLogId === log.id}
                      className="mt-3 btn-pill btn-pill-outline text-xs disabled:opacity-60"
                    >
                      {processingLogId === log.id ? "Verifying..." : "Verify"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="mt-6 text-xs text-[var(--color-muted-foreground)]">
          Points remain subtle and secondary. Cultural guidance and verification stay primary in the regeneration flow.
        </p>
      </div>
    </div>
  );
}
