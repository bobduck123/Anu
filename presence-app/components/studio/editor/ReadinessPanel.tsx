"use client";

import { AlertTriangle, CheckCircle2, Circle, Sparkles } from "lucide-react";
import type { ReadinessReport, ReadinessIssue } from "@/lib/editor/readiness";

export default function ReadinessPanel({
  report,
  onNavigate,
}: {
  report: ReadinessReport;
  onNavigate?: (tabId: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Readiness</p>
            <h3 className="mt-1 text-3xl font-semibold text-stone-50">{report.percentage}%</h3>
            <p className="mt-1 text-xs text-stone-400">
              {report.hasBlockingIssues ? "Critical room controls need attention before publishing." : "Critical checks are clear."}
            </p>
          </div>
          <ScoreRing percentage={report.percentage} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <CountPill label="Critical" count={report.critical.length} tone="danger" />
          <CountPill label="Recommended" count={report.recommended.length} tone="warn" />
          <CountPill label="Polish" count={report.polish.length} tone="info" />
        </div>
      </div>

      <IssueGroup title="Critical" issues={report.critical} empty="No critical blockers." onNavigate={onNavigate} />
      <IssueGroup title="Recommended" issues={report.recommended} empty="No recommended improvements pending." onNavigate={onNavigate} />
      <IssueGroup title="Polish" issues={report.polish} empty="No polish suggestions pending." onNavigate={onNavigate} />

      {report.tips.length > 0 && (
        <div className="rounded-3xl border border-amber-200/15 bg-amber-200/10 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
            <Sparkles className="h-4 w-4" />
            Improvement tips
          </div>
          <div className="mt-3 grid gap-2">
            {report.tips.map((tip) => (
              <button
                key={tip.id}
                type="button"
                onClick={() => onNavigate?.(tip.tabId)}
                className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-left text-xs leading-5 text-stone-200 transition hover:border-amber-200/40"
              >
                {tip.message}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IssueGroup({
  title,
  issues,
  empty,
  onNavigate,
}: {
  title: string;
  issues: ReadinessIssue[];
  empty: string;
  onNavigate?: (tabId: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">{title}</p>
      {issues.length === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          {empty}
        </div>
      ) : (
        issues.map((issue) => (
          <button
            key={issue.id}
            type="button"
            onClick={() => onNavigate?.(issue.tabId)}
            className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-left text-xs leading-5 text-stone-200 transition hover:border-amber-200/40"
          >
            <AlertTriangle className={issue.severity === "critical" ? "mt-0.5 h-4 w-4 shrink-0 text-red-300" : "mt-0.5 h-4 w-4 shrink-0 text-amber-200"} />
            <span>
              <span className="block font-semibold">{issue.label}</span>
              <span className="text-stone-500">{issue.detail}</span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function CountPill({ label, count, tone }: { label: string; count: number; tone: "danger" | "warn" | "info" }) {
  const toneClass = tone === "danger" ? "text-red-200" : tone === "warn" ? "text-amber-100" : "text-sky-100";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
      <p className={`font-semibold ${toneClass}`}>{count}</p>
      <p className="text-[10px] uppercase tracking-[0.14em] text-stone-500">{label}</p>
    </div>
  );
}

function ScoreRing({ percentage }: { percentage: number }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div className="relative h-20 w-20">
      <svg className="-rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-white/10" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className={percentage >= 80 ? "text-emerald-300" : percentage >= 55 ? "text-amber-200" : "text-red-300"} />
      </svg>
      <Circle className="absolute inset-0 m-auto h-2 w-2 fill-current text-stone-400" />
    </div>
  );
}
