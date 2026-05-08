"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, LockKeyhole } from "lucide-react";
import { StudioAuthGate } from "@/components/auth/StudioAuthGate";
import { createClient } from "@/lib/supabase/client";
import { studioContactHref } from "@/lib/supabase/config";
import { submitBetaApplication, startBetaPresence, type BetaApplicationInput } from "@/lib/api/beta";
import { PresenceApiError } from "@/lib/api/client";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "presence.betaOnboardingRequest";

// Aligned with backend whitelist in presence.py / _ALLOWED_BETA_*
const presenceTypes = [
  ["artist", "Artist"],
  ["practitioner", "Practitioner"],
  ["venue_collective", "Venue / Collective"],
  ["organisation", "Cultural Organisation"],
  ["creative_professional", "Creative Professional"],
  ["consultant", "Consultant / Advisor"],
  ["service_professional", "Service Professional / Trade"],
  ["other", "Other"],
];

const purposes = [
  ["portfolio", "Portfolio"],
  ["gallery", "Gallery"],
  ["practitioner_profile", "Practitioner profile"],
  ["venue_collective", "Venue / Collective"],
  ["organisation", "Cultural organisation"],
  ["professional_profile", "Consultant / Professional"],
  ["service_profile", "Service / Trade"],
];

const ctas = [
  ["contact", "Contact me"],
  ["conversation", "Book a conversation"],
  ["viewing", "Request viewing"],
  ["work_enquiry", "Enquire about work"],
  ["commission_request", "Commission request"],
  ["quote_request", "Request a quote"],
  ["visit_partner_support", "Visit / partner / support"],
];

const templates = [
  ["unsure", "Unsure — guide me"],
  ["minimal_artist_portal", "Minimal Artist Portal"],
  ["gallery_wall", "Gallery Wall"],
  ["editorial_portfolio", "Editorial Portfolio"],
  ["studio_practice", "Studio Practice"],
  ["practitioner_pathway", "Practitioner Pathway"],
  ["venue_collective_node", "Venue / Collective Node"],
];

const moods = [
  ["nocturne", "Nocturne — dark, atmospheric"],
  ["gallery_white", "Gallery white — bright, sparse"],
  ["warm_studio", "Warm studio — paper, wood, weave"],
  ["editorial_paper", "Editorial paper — dossier, archive"],
  ["care_path", "Care path — sage, calm, grounded"],
  ["public_noticeboard", "Public noticeboard — institutional"],
  ["institutional_dusk", "Institutional dusk — civic warmth"],
  ["signal_field", "Signal field — minimal, ceremonial"],
];

const betaModes = [
  ["draft_self_build", "Build a draft myself now"],
  ["studio_assisted", "Studio-assisted setup"],
  ["setup_request", "Studio reviews and replies"],
];

type BetaForm = {
  displayName: string;
  presenceType: string;
  desiredSlug: string;
  headline: string;
  primaryPurpose: string;
  primaryCta: string;
  templateDirection: string;
  visualMood: string;
  location: string;
  description: string;
  betaMode: string;
  acknowledgedDraft: boolean;
};

function emptyForm(): BetaForm {
  return {
    displayName: "",
    presenceType: "artist",
    desiredSlug: "",
    headline: "",
    primaryPurpose: "portfolio",
    primaryCta: "contact",
    templateDirection: "unsure",
    visualMood: "warm_studio",
    location: "",
    description: "",
    betaMode: "draft_self_build",
    acknowledgedDraft: false,
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)]">
        {label}
      </span>
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-[var(--p-studio-text)] outline-none transition placeholder:text-[var(--p-studio-muted)] focus:border-[var(--p-studio-accent)]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-[var(--p-studio-text)] outline-none transition focus:border-[var(--p-studio-accent)]"
      >
        {options.map(([key, labelText]) => (
          <option key={key} value={key}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BetaOnboardingForm() {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [form, setForm] = useState<BetaForm>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [persistMode, setPersistMode] = useState<"draft" | "application" | "local-only">("local-only");
  const [draftSlug, setDraftSlug] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setAuthRequired(true);
        setLoading(false);
        return;
      }
      const user = session.user;
      if (user?.email && !user.email_confirmed_at && !user.confirmed_at) {
        setVerificationEmail(user.email);
        setLoading(false);
        return;
      }
      const metadata = user?.user_metadata as Record<string, string> | undefined;
      const email = user?.email ?? null;
      setUserEmail(email);
      setForm((current) => ({
        ...current,
        displayName: metadata?.display_name ?? current.displayName,
        presenceType: metadata?.intended_presence_type ?? current.presenceType,
      }));
      setLoading(false);
    }
    void load();
  }, []);

  const mailtoHref = useMemo(() => {
    const body = [
      "Presence beta setup request",
      "",
      `Account email: ${userEmail ?? ""}`,
      `Display name: ${form.displayName}`,
      `Presence type: ${form.presenceType}`,
      `Desired slug: ${form.desiredSlug}`,
      `Headline/world statement: ${form.headline}`,
      `Primary purpose: ${form.primaryPurpose}`,
      `Primary CTA: ${form.primaryCta}`,
      `Location: ${form.location}`,
      "",
      "What I want to build:",
      form.description,
    ].join("\n");
    const subject = encodeURIComponent("Presence beta setup request");
    return `${studioContactHref()}?subject=${subject}&body=${encodeURIComponent(body)}`;
  }, [form, userEmail]);

  function update<K extends keyof BetaForm>(key: K, value: BetaForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "displayName" && !current.desiredSlug
        ? { desiredSlug: slugify(String(value)) }
        : {}),
    }));
    setSubmitted(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.displayName.trim()) {
      setError("Add the public name for your Presence.");
      return;
    }
    if (!form.desiredSlug.trim()) {
      setError("Choose a desired public slug.");
      return;
    }
    if (!form.headline.trim()) {
      setError("Add a short world statement so the setup request has direction.");
      return;
    }
    if (!form.acknowledgedDraft) {
      setError("Confirm that beta Presences begin as draft or setup-pending.");
      return;
    }

    // Always cache the request locally first so the user never loses input.
    const localPayload = {
      ...form,
      accountEmail: userEmail,
      submittedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localPayload));

    // Server persistence path:
    // 1. If user chose "draft_self_build" → try POST /owner/beta/start
    //    On success → redirect to /studio/[id]
    //    On 409 duplicate_starter → user already has a node → redirect anyway
    //    On other failure → fall through to application persistence
    // 2. Else → POST /beta/applications (Studio reviews and replies)
    setSubmitting(true);
    setPersistMode("local-only");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubmitted(true);
        return;
      }
      const apiPayload: BetaApplicationInput = {
        display_name: form.displayName,
        desired_slug: form.desiredSlug || null,
        presence_type: form.presenceType || null,
        primary_purpose: form.primaryPurpose || null,
        primary_cta: form.primaryCta || null,
        template_direction: form.templateDirection || null,
        visual_mood: form.visualMood || null,
        location_label: form.location || null,
        headline: form.headline || null,
        description: form.description || null,
        beta_mode:
          (form.betaMode as BetaApplicationInput["beta_mode"]) || "setup_request",
      };

      const wantsDraft = form.betaMode === "draft_self_build";

      if (wantsDraft) {
        try {
          const draft = await startBetaPresence(session.access_token, apiPayload);
          setPersistMode("draft");
          setDraftId(draft.id);
          setDraftSlug(draft.slug);
          setSubmitted(true);
          // Redirect after a short success state so the user knows what happened.
          setTimeout(() => router.push(`/studio/${draft.id}`), 1500);
          return;
        } catch (e) {
          // Duplicate starter → user already has a node; route to /studio.
          if (e instanceof PresenceApiError && e.code === "duplicate_starter") {
            setPersistMode("draft");
            setSubmitted(true);
            setTimeout(() => router.push("/studio"), 800);
            return;
          }
          // Duplicate slug → surface and let user retry without falling through.
          if (e instanceof PresenceApiError && e.code === "duplicate_slug") {
            setError(
              "That public address is already taken. Choose another and try again.",
            );
            return;
          }
          // Anything else → fall through to application persistence.
          // (Don't lose the user's input.)
        }
      }

      // Application persistence — works for both "setup_request" and
      // "studio_assisted" beta modes, and as the fall-through for failures.
      await submitBetaApplication(session.access_token, apiPayload);
      setPersistMode("application");
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Setup request server unavailable.";
      setPersistMode("local-only");
      setError(
        `${message} Your request is saved locally — send it via email below or try again later.`,
      );
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-10 text-[var(--p-studio-text)]">
        <p className="text-sm text-[var(--p-studio-muted)]">Opening beta onboarding...</p>
      </main>
    );
  }

  if (authRequired) {
    return (
      <StudioAuthGate
        returnTo="/beta/onboarding"
        title="Sign in to begin beta onboarding"
        body="Create or sign in to a verified Presence Studio account before requesting your first public world."
      />
    );
  }

  if (verificationEmail) {
    const params = new URLSearchParams();
    params.set("email", verificationEmail);
    params.set("returnTo", "/beta/onboarding");
    return (
      <main className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-10 text-[var(--p-studio-text)] safe-top">
        <div className="mx-auto max-w-lg rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-6">
          <LockKeyhole className="mb-5 h-5 w-5 text-[var(--p-studio-accent)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
            Verify first
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Confirm your email</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--p-studio-muted)]">
            Verify {verificationEmail} before sending a beta setup request.
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

  return (
    <main className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-8 text-[var(--p-studio-text)] safe-top">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/studio"
          className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]"
        >
          Presence Studio
        </Link>

        <section className="mt-6 rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
            Beta onboarding
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Begin shaping your public world
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--p-studio-muted)]">
            Public beta accounts are verified first. Your first Presence starts
            as draft or setup-pending; nothing is published until it is ready.
          </p>

          <form className="mt-6 grid gap-4" onSubmit={submit}>
            {error && (
              <p className="rounded-2xl border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-200">
                {error}
              </p>
            )}
            {submitted && (
              <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/30 p-4 text-sm leading-6 text-emerald-100">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <CheckCircle className="h-4 w-4" />
                  {persistMode === "draft"
                    ? "Draft Presence created"
                    : persistMode === "application"
                      ? "Setup request received by Studio"
                      : "Setup request prepared locally"}
                </div>
                <p>
                  {persistMode === "draft"
                    ? draftSlug
                      ? `Your draft Presence /p/${draftSlug} has been created as draft and private. Opening Studio now…`
                      : "Opening Studio now…"
                    : persistMode === "application"
                      ? "Your beta application is now visible to the Presence team. We will reply with the next step (studio-assisted setup or a draft Presence) within a working week. Nothing is published yet."
                      : "Your request is saved in this browser. Send it to the Presence team via email below, or try again to submit it server-side."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {persistMode === "draft" && draftId !== null ? (
                    <Link
                      href={`/studio/${draftId}`}
                      className="rounded-2xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
                    >
                      Open my draft Presence
                    </Link>
                  ) : (
                    <a
                      href={mailtoHref}
                      className="rounded-2xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
                    >
                      {persistMode === "application" ? "Add a note via email" : "Send setup request"}
                    </a>
                  )}
                  <Link
                    href="/studio"
                    className="rounded-2xl border border-[var(--p-studio-border)] px-4 py-2 text-sm font-semibold text-[var(--p-studio-text)] transition hover:border-[var(--p-studio-accent)]/60"
                  >
                    Return to Studio
                  </Link>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Public display name" value={form.displayName} onChange={(value) => update("displayName", value)} />
              <Field label="Desired slug" value={form.desiredSlug} onChange={(value) => update("desiredSlug", slugify(value))} placeholder="your-public-name" />
            </div>
            <Field label="Headline / world statement" value={form.headline} onChange={(value) => update("headline", value)} placeholder="A short sentence that tells people what world they are entering" />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Presence type" value={form.presenceType} options={presenceTypes} onChange={(value) => update("presenceType", value)} />
              <SelectField label="Primary purpose" value={form.primaryPurpose} options={purposes} onChange={(value) => update("primaryPurpose", value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Primary call to action" value={form.primaryCta} options={ctas} onChange={(value) => update("primaryCta", value)} />
              <Field label="Location / service area" value={form.location} onChange={(value) => update("location", value)} required={false} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Template direction" value={form.templateDirection} options={templates} onChange={(value) => update("templateDirection", value)} />
              <SelectField label="Visual mood" value={form.visualMood} options={moods} onChange={(value) => update("visualMood", value)} />
            </div>
            <SelectField label="How would you like to begin?" value={form.betaMode} options={betaModes} onChange={(value) => update("betaMode", value)} />
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)]">
                What do you want to build?
              </span>
              <textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                rows={5}
                className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-[var(--p-studio-text)] outline-none transition placeholder:text-[var(--p-studio-muted)] focus:border-[var(--p-studio-accent)]"
                placeholder="Tell us about your practice, works, services, venue, organisation, or portfolio direction."
              />
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-[var(--p-studio-border)] bg-black/10 p-4 text-sm leading-6 text-[var(--p-studio-muted)]">
              <input
                type="checkbox"
                checked={form.acknowledgedDraft}
                onChange={(event) => update("acknowledgedDraft", event.target.checked)}
                className="mt-1"
              />
              <span>
                I understand that beta Presences begin as draft or
                setup-pending and are not published automatically.
              </span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit beta request"}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
