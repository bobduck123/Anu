"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  LockKeyhole,
  AlertTriangle,
} from "lucide-react";

import { StudioAuthGate } from "@/components/auth/StudioAuthGate";
import { createClient } from "@/lib/supabase/client";
import {
  isEmailVerificationRequired,
  studioContactHref,
} from "@/lib/supabase/config";
import { startBetaPresence, type BetaApplicationInput } from "@/lib/api/beta";
import { PresenceApiError } from "@/lib/api/client";

const STORAGE_KEY = "presence.onboardingDraft.v2";

// ── Question vocabulary (mapped to backend whitelists) ─────────────────────

const PRESENCE_TYPES: Array<[string, string, string]> = [
  ["artist", "Artist", "Painter, sculptor, multidisciplinary, maker."],
  ["creative_professional", "Gallery / Portfolio", "Curator, designer, writer, photographer."],
  ["practitioner", "Practitioner", "Therapist, coach, somatic worker, healer."],
  ["venue_collective", "Venue / Collective", "Studio, room, residency, collective space."],
  ["organisation", "Cultural Organisation", "Mission-led arts or community body."],
  ["consultant", "Consultant / Professional", "Advisory, fractional, board, RFP."],
  ["service_professional", "Service Professional / Trade", "Field service, tradie, allied."],
  ["other", "Other", "Something else — we'll route to a sensible default."],
];

const PURPOSES: Array<[string, string]> = [
  ["portfolio", "Show selected works"],
  ["gallery", "Run a public gallery"],
  ["practitioner_profile", "Share method & sessions"],
  ["venue_collective", "Build a venue / collective node"],
  ["organisation", "Speak as an organisation"],
  ["professional_profile", "Prepare a public profile for contracts"],
  ["service_profile", "Be findable for jobs"],
  ["other", "Something else"],
];

const CTAS: Array<[string, string]> = [
  ["contact", "Contact me"],
  ["work_enquiry", "Enquire about a work"],
  ["viewing", "Request a private viewing"],
  ["commission_request", "Commission work"],
  ["conversation", "Book a conversation"],
  ["quote_request", "Request a quote"],
  ["visit_partner_support", "Visit / partner / support"],
  ["other", "Something else"],
];

const TEMPLATES: Array<[string, string, string]> = [
  ["unsure", "Not sure — recommend one", "We'll choose a sensible template based on your type."],
  ["minimal_artist_portal", "Minimal Portal", "Threshold / private exhibition / dark signal field."],
  ["gallery_wall", "Gallery Wall", "Image-led wall, collection rooms, work enquiry."],
  ["editorial_portfolio", "Editorial Dossier", "Magazine dossier, case studies, proof blocks."],
  ["studio_practice", "Studio Practice", "Workbench, process, materials, fragments."],
  ["practitioner_pathway", "Practitioner Pathway", "Care pathway, method, services, intake."],
  ["venue_collective_node", "Venue Noticeboard", "Public noticeboard, programs, partner / support."],
];

const MOODS: Array<[string, string]> = [
  ["nocturne", "Nocturne — dark, atmospheric"],
  ["gallery_white", "Gallery white — bright, sparse"],
  ["warm_studio", "Warm studio — paper, wood, weave"],
  ["editorial_paper", "Editorial paper — dossier, archive"],
  ["care_path", "Care path — sage, calm, grounded"],
  ["public_noticeboard", "Public noticeboard — institutional"],
  ["institutional_dusk", "Institutional dusk — civic warmth"],
  ["signal_field", "Signal field — minimal, ceremonial"],
  ["earth_craft", "Earth / craft — material, grounded"],
  ["clean_professional", "Clean professional — confident, neutral"],
];

const INTENSITIES: Array<[string, string]> = [
  ["restrained", "Restrained — quiet, considered"],
  ["expressive", "Expressive — clear voice"],
  ["atmospheric", "Atmospheric — felt, immersive"],
  ["flagship", "Flagship — full visual world"],
];

// ── Form shape ────────────────────────────────────────────────────────────

type Form = {
  // Step 1
  displayName: string;
  desiredSlug: string;
  location: string;
  headline: string;
  // Step 2
  presenceType: string;
  // Step 3
  primaryPurpose: string;
  // Step 4
  primaryCta: string;
  // Step 5
  templateDirection: string;
  visualMood: string;
  intensity: string;
  // Step 6
  worldStatement: string;
  proofNote: string;
};

function emptyForm(): Form {
  return {
    displayName: "",
    desiredSlug: "",
    location: "",
    headline: "",
    presenceType: "artist",
    primaryPurpose: "portfolio",
    primaryCta: "contact",
    templateDirection: "unsure",
    visualMood: "warm_studio",
    intensity: "expressive",
    worldStatement: "",
    proofNote: "",
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StepFrame(props: {
  step: number;
  total: number;
  eyebrow: string;
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-6 sm:p-8 shadow-2xl shadow-stone-950/30">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--p-studio-muted)]">
          {props.eyebrow}
        </p>
        <span className="text-xs font-mono text-[var(--p-studio-muted)]">
          {String(props.step).padStart(2, "0")} / {String(props.total).padStart(2, "0")}
        </span>
      </div>
      <h2
        className="mt-3 text-3xl font-semibold tracking-tight text-[var(--p-studio-text)] sm:text-4xl"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {props.title}
      </h2>
      {props.body && (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--p-studio-muted)]">
          {props.body}
        </p>
      )}
      <div className="mt-7 flex flex-col gap-5">{props.children}</div>
    </section>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div
      className="h-[3px] w-full rounded-full bg-[var(--p-studio-border)] overflow-hidden"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-[var(--p-studio-accent)] transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  required = true,
  hint,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-[var(--p-studio-text)] outline-none transition placeholder:text-[var(--p-studio-muted)] focus:border-[var(--p-studio-accent)]"
      />
      {hint && <span className="text-xs leading-5 text-[var(--p-studio-muted)]">{hint}</span>}
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  hint,
  maxLength = 1500,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)]">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-sm leading-7 text-[var(--p-studio-text)] outline-none transition placeholder:text-[var(--p-studio-muted)] focus:border-[var(--p-studio-accent)]"
      />
      {hint && <span className="text-xs leading-5 text-[var(--p-studio-muted)]">{hint}</span>}
    </label>
  );
}

function ChoiceCards({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Array<[string, string] | [string, string, string]>;
  value: string;
  onChange: (v: string) => void;
  columns?: number;
}) {
  const cols = columns === 3 ? "sm:grid-cols-3" : columns === 1 ? "sm:grid-cols-1" : "sm:grid-cols-2";
  return (
    <div className={`grid grid-cols-1 ${cols} gap-3`}>
      {options.map(([key, label, desc]) => {
        const active = value === key;
        return (
          <button
            type="button"
            key={key}
            onClick={() => onChange(key)}
            className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${
              active
                ? "border-[var(--p-studio-accent)] bg-[var(--p-studio-accent)]/12 text-[var(--p-studio-text)] shadow-[0_8px_30px_-12px_rgba(251,146,60,0.6)]"
                : "border-[var(--p-studio-border)] bg-black/15 text-[var(--p-studio-text)] hover:border-[var(--p-studio-accent)]/50"
            }`}
            aria-pressed={active}
          >
            <span className="text-sm font-semibold">{label}</span>
            {desc && <span className="text-xs leading-5 text-[var(--p-studio-muted)]">{desc}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Pills({
  options,
  value,
  onChange,
}: {
  options: Array<[string, string]>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([key, label]) => {
        const active = value === key;
        return (
          <button
            type="button"
            key={key}
            onClick={() => onChange(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
              active
                ? "border-[var(--p-studio-accent)] bg-[var(--p-studio-accent)] text-stone-950"
                : "border-[var(--p-studio-border)] bg-transparent text-[var(--p-studio-muted)] hover:border-[var(--p-studio-accent)]/60 hover:text-[var(--p-studio-text)]"
            }`}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Wizard ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7;

export function OnboardingWizard() {
  const router = useRouter();
  const emailVerificationRequired = isEmailVerificationRequired();
  const [authState, setAuthState] = useState<"loading" | "needs_auth" | "needs_verify" | "ready">("loading");
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: number; slug: string } | null>(null);

  // ── Init: load auth state + draft from localStorage ─────────────────────
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session) {
          setAuthState("needs_auth");
          return;
        }
        const user = session.user;
        if (
          emailVerificationRequired &&
          user?.email &&
          !user.email_confirmed_at &&
          !user.confirmed_at
        ) {
          setVerificationEmail(user.email);
          setAuthState("needs_verify");
          return;
        }
        const metadata = (user?.user_metadata ?? {}) as Record<string, string>;
        setAccountEmail(user?.email ?? null);
        // Restore draft if available, otherwise prefill from signup metadata.
        if (typeof window !== "undefined") {
          const stored = window.localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as Partial<Form>;
              setForm((f) => ({ ...f, ...parsed }));
            } catch {}
          } else {
            setForm((f) => ({
              ...f,
              displayName: metadata.display_name ?? f.displayName,
              presenceType: metadata.intended_presence_type ?? f.presenceType,
            }));
          }
        }
        setAuthState("ready");
      } catch {
        if (!cancelled) setAuthState("needs_auth");
      }
    }
    void init();
    return () => { cancelled = true; };
  }, [emailVerificationRequired]);

  // Persist draft on every change so the user never loses progress.
  useEffect(() => {
    if (typeof window === "undefined" || authState !== "ready") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form, authState]);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // When the user edits displayName before slug, derive slug live.
      if (key === "displayName" && !f.desiredSlug) {
        next.desiredSlug = slugify(String(value));
      }
      return next;
    });
    setError(null);
  }

  // ── Step validation ────────────────────────────────────────────────────
  function validateStep(n: number): string | null {
    if (n === 1) {
      if (!form.displayName.trim()) return "Add the public name visitors will see.";
      if (!form.desiredSlug.trim()) return "Choose a public address (slug).";
      if (!/^[a-z0-9-]+$/.test(form.desiredSlug)) return "Use only lowercase letters, numbers, and hyphens.";
      if (!form.headline.trim()) return "Add a one-line headline so the page has direction.";
    }
    if (n === 6) {
      if (!form.worldStatement.trim()) return "Add a short world statement for the page hero.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  async function generate() {
    // Validate all required steps once more.
    for (const n of [1, 6]) {
      const err = validateStep(n);
      if (err) {
        setStep(n);
        setError(err);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAuthState("needs_auth");
        return;
      }
      const apiPayload: BetaApplicationInput & {
        intensity?: string;
        world_statement?: string;
        proof_note?: string;
      } = {
        display_name: form.displayName,
        desired_slug: form.desiredSlug,
        presence_type: form.presenceType,
        primary_purpose: form.primaryPurpose,
        primary_cta: form.primaryCta,
        template_direction: form.templateDirection,
        visual_mood: form.visualMood,
        location_label: form.location || null,
        headline: form.headline,
        description: form.worldStatement,
        beta_mode: "draft_self_build",
        intensity: form.intensity,
        world_statement: form.worldStatement,
        proof_note: form.proofNote,
      };
      try {
        const draft = await startBetaPresence(session.access_token, apiPayload);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        setSuccess({ id: draft.id, slug: draft.slug });
        setTimeout(() => router.push(`/studio/${draft.id}`), 1500);
        return;
      } catch (e) {
        if (e instanceof PresenceApiError && e.code === "duplicate_starter") {
          // The user already has a Presence; route to Studio.
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(STORAGE_KEY);
          }
          router.push("/studio");
          return;
        }
        if (e instanceof PresenceApiError && e.code === "duplicate_slug") {
          setStep(1);
          setError(
            "That public address is already taken. Choose another and try again.",
          );
          return;
        }
        const message =
          e instanceof Error
            ? e.message
            : "We couldn't create your draft Presence right now.";
        setError(`${message} Your answers are still saved on this device.`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Auth gate states ───────────────────────────────────────────────────
  if (authState === "loading") {
    return (
      <main className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-10 text-[var(--p-studio-text)] safe-top">
        <p className="mx-auto max-w-2xl text-sm text-[var(--p-studio-muted)]">
          Opening your onboarding...
        </p>
      </main>
    );
  }
  if (authState === "needs_auth") {
    return (
      <StudioAuthGate
        returnTo="/onboarding"
        title="Sign in to begin onboarding"
        body={
          emailVerificationRequired
            ? "Create or sign in to a verified Presence Studio account, then we'll guide you through shaping your first public world."
            : "Create or sign in to a Presence Studio account, then we'll guide you through shaping your first public world."
        }
      />
    );
  }
  if (authState === "needs_verify" && verificationEmail) {
    const params = new URLSearchParams();
    params.set("email", verificationEmail);
    params.set("returnTo", "/onboarding");
    return (
      <main className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-10 text-[var(--p-studio-text)] safe-top">
        <div className="mx-auto max-w-lg rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-6">
          <LockKeyhole className="mb-5 h-5 w-5 text-[var(--p-studio-accent)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
            Verify first
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Confirm your email</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--p-studio-muted)]">
            Verify {verificationEmail} before we generate your draft Presence.
          </p>
          <Link
            href={`/auth/verify-email?${params.toString()}`}
            className="mt-6 inline-flex rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
          >
            Enter verification code
          </Link>
        </div>
      </main>
    );
  }

  // ── Success state (just before redirect) ───────────────────────────────
  if (success) {
    return (
      <main className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-10 text-[var(--p-studio-text)] safe-top">
        <div className="mx-auto max-w-lg rounded-3xl border border-emerald-700/50 bg-emerald-950/30 p-8 text-emerald-100">
          <CheckCircle2 className="mb-5 h-7 w-7 text-emerald-300" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Draft created
          </p>
          <h1
            className="mt-3 text-3xl font-semibold tracking-tight"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Your draft Presence is ready
          </h1>
          <p className="mt-3 text-sm leading-7">
            We generated <span className="font-mono text-emerald-200">/p/{success.slug}</span> as a private draft. Opening Studio so you can shape it.
          </p>
          <Link
            href={`/studio/${success.id}`}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
          >
            Open Studio now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  // ── Wizard shell ───────────────────────────────────────────────────────
  return (
    <main className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-8 text-[var(--p-studio-text)] safe-top sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Presence Studio
        </Link>

        <header className="mt-6 mb-5 flex flex-col gap-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-[var(--p-studio-muted)]">
            <Sparkles className="h-3 w-3 text-[var(--p-studio-accent)]" />
            Presence onboarding
          </p>
          <h1
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Shape your first Presence
          </h1>
          <p className="max-w-xl text-sm leading-7 text-[var(--p-studio-muted)]">
            Seven calm questions. We'll generate a private draft Presence
            tailored to your answers — and open Studio so you can shape it
            from there. Drafts stay private until you publish.
          </p>
          <ProgressBar step={step} total={TOTAL_STEPS} />
        </header>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-900/70 bg-amber-950/30 p-4 text-sm leading-6 text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1 — Identity */}
        {step === 1 && (
          <StepFrame
            step={1}
            total={TOTAL_STEPS}
            eyebrow="Identity"
            title="Name the public world people will enter."
            body="Three short fields — visitors will see all of them on your page hero."
          >
            <TextInput label="Public name" value={form.displayName} onChange={(v) => update("displayName", v)} placeholder="e.g. Mira Cole" />
            <TextInput
              label="Public address (slug)"
              value={form.desiredSlug}
              onChange={(v) => update("desiredSlug", slugify(v))}
              placeholder="your-public-name"
              hint="Lowercase letters, numbers, and hyphens. Your Presence will live at /p/<slug>."
              maxLength={80}
            />
            <TextInput label="Where are you based?" value={form.location} onChange={(v) => update("location", v)} required={false} placeholder="Hobart, Tasmania" />
            <TextInput
              label="One-line headline"
              value={form.headline}
              onChange={(v) => update("headline", v)}
              placeholder="A sentence visitors should remember about you"
              maxLength={220}
            />
          </StepFrame>
        )}

        {/* Step 2 — Presence type */}
        {step === 2 && (
          <StepFrame
            step={2}
            total={TOTAL_STEPS}
            eyebrow="Type"
            title="What kind of Presence are you building?"
            body="Pick the closest match — we'll use this to choose a base template and route language through the page."
          >
            <ChoiceCards options={PRESENCE_TYPES} value={form.presenceType} onChange={(v) => update("presenceType", v)} />
          </StepFrame>
        )}

        {/* Step 3 — Purpose */}
        {step === 3 && (
          <StepFrame
            step={3}
            total={TOTAL_STEPS}
            eyebrow="Purpose"
            title="What should this Presence help you do first?"
            body="One primary purpose. You can layer more later inside Studio."
          >
            <ChoiceCards options={PURPOSES.map(([k, l]) => [k, l]) as Array<[string, string]>} value={form.primaryPurpose} onChange={(v) => update("primaryPurpose", v)} />
          </StepFrame>
        )}

        {/* Step 4 — Opportunity route / CTA */}
        {step === 4 && (
          <StepFrame
            step={4}
            total={TOTAL_STEPS}
            eyebrow="Opportunity"
            title="What should visitors be able to do?"
            body="This becomes the primary call-to-action on your page and the default enquiry type."
          >
            <ChoiceCards options={CTAS.map(([k, l]) => [k, l]) as Array<[string, string]>} value={form.primaryCta} onChange={(v) => update("primaryCta", v)} />
          </StepFrame>
        )}

        {/* Step 5 — Visual world */}
        {step === 5 && (
          <StepFrame
            step={5}
            total={TOTAL_STEPS}
            eyebrow="Visual world"
            title="What should the Presence feel like?"
            body="Choose a template direction, a mood, and how loud the world should be. Studio will let you refine all of these later."
          >
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)]">Template direction</p>
              <ChoiceCards options={TEMPLATES} value={form.templateDirection} onChange={(v) => update("templateDirection", v)} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)]">Visual mood</p>
              <Pills options={MOODS} value={form.visualMood} onChange={(v) => update("visualMood", v)} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)]">Intensity</p>
              <Pills options={INTENSITIES} value={form.intensity} onChange={(v) => update("intensity", v)} />
            </div>
          </StepFrame>
        )}

        {/* Step 6 — World statement + optional proof */}
        {step === 6 && (
          <StepFrame
            step={6}
            total={TOTAL_STEPS}
            eyebrow="Words"
            title="Describe what people should understand when they arrive."
            body="A short paragraph for the hero. You can edit this in Studio at any time."
          >
            <Textarea
              label="World statement"
              value={form.worldStatement}
              onChange={(v) => update("worldStatement", v)}
              rows={5}
              placeholder="Tell visitors what kind of world they are entering — your practice, the people you serve, what you make."
            />
            <Textarea
              label="Proof note (optional)"
              value={form.proofNote}
              onChange={(v) => update("proofNote", v)}
              rows={3}
              hint="What makes people trust your work? A line of evidence, lineage, exhibitions, certifications, or impact."
              placeholder="Optional. Visible in your draft as a public proof summary."
            />
          </StepFrame>
        )}

        {/* Step 7 — Review and generate */}
        {step === 7 && (
          <ReviewStep form={form} accountEmail={accountEmail} submitting={submitting} onGenerate={generate} />
        )}

        {/* Step nav */}
        {step < TOTAL_STEPS && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 1}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--p-studio-border)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)] transition hover:border-[var(--p-studio-accent)]/60 hover:text-[var(--p-studio-text)] disabled:opacity-40 disabled:pointer-events-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <footer className="mt-8 text-xs leading-6 text-[var(--p-studio-muted)]">
          Need help while drafting?{" "}
          <a href={studioContactHref()} className="text-[var(--p-studio-text)] underline-offset-4 hover:underline">
            Contact the studio
          </a>
          .
        </footer>
      </div>
    </main>
  );
}

// ── Review step ─────────────────────────────────────────────────────────

function ReviewStep({
  form,
  accountEmail,
  submitting,
  onGenerate,
}: {
  form: Form;
  accountEmail: string | null;
  submitting: boolean;
  onGenerate: () => void | Promise<void>;
}) {
  const summary = useMemo(
    () => [
      ["Public name", form.displayName],
      ["Public address", `/p/${form.desiredSlug}`],
      ["Type", form.presenceType.replace(/_/g, " ")],
      ["Purpose", form.primaryPurpose.replace(/_/g, " ")],
      ["Visitor action", form.primaryCta.replace(/_/g, " ")],
      ["Template", form.templateDirection.replace(/_/g, " ")],
      ["Mood", form.visualMood.replace(/_/g, " ")],
      ["Intensity", form.intensity],
      ["Headline", form.headline],
      ["Location", form.location || "—"],
    ] as Array<[string, string]>,
    [form],
  );
  return (
    <StepFrame
      step={7}
      total={TOTAL_STEPS}
      eyebrow="Review"
      title="Your base Presence will be generated as a private draft."
      body="Review your answers. Nothing becomes public until you publish."
    >
      {accountEmail && (
        <p className="text-xs leading-5 text-[var(--p-studio-muted)]">
          Owner: <span className="font-mono text-[var(--p-studio-text)]">{accountEmail}</span>
        </p>
      )}

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {summary.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--p-studio-border)] bg-black/15 p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--p-studio-muted)]">
              {label}
            </dt>
            <dd className="mt-1 text-sm text-[var(--p-studio-text)] break-words">{value}</dd>
          </div>
        ))}
      </dl>

      {form.worldStatement && (
        <div className="rounded-2xl border border-[var(--p-studio-border)] bg-black/15 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--p-studio-muted)]">World statement</p>
          <p className="mt-2 text-sm leading-7 text-[var(--p-studio-text)] whitespace-pre-wrap">{form.worldStatement}</p>
        </div>
      )}
      {form.proofNote && (
        <div className="rounded-2xl border border-[var(--p-studio-border)] bg-black/15 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--p-studio-muted)]">Proof note</p>
          <p className="mt-2 text-sm leading-7 text-[var(--p-studio-text)] whitespace-pre-wrap">{form.proofNote}</p>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--p-studio-accent)]/40 bg-[var(--p-studio-accent)]/10 p-4 text-sm leading-6 text-[var(--p-studio-text)]">
        <p className="font-semibold">Status: <span className="font-mono">draft / private / unpublished</span></p>
        <p className="mt-1 text-xs leading-5 text-[var(--p-studio-muted)]">
          Public visitors land on a 404 until you publish from Studio. Your QR / NFC code is held back until then.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void onGenerate()}
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300 disabled:opacity-60 disabled:pointer-events-none"
      >
        {submitting ? "Generating draft Presence…" : "Create my draft Presence"}
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </button>
    </StepFrame>
  );
}
