"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, LockKeyhole } from "lucide-react";
import { StudioAuthGate } from "@/components/auth/StudioAuthGate";
import { createClient } from "@/lib/supabase/client";
import { studioContactHref } from "@/lib/supabase/config";

const STORAGE_KEY = "presence.betaOnboardingRequest";

const presenceTypes = [
  ["artist", "Artist"],
  ["practitioner", "Practitioner"],
  ["venue_collective", "Venue / Collective"],
  ["organisation", "Organisation"],
  ["creative_professional", "Creative Professional"],
  ["other", "Other"],
];

const purposes = [
  ["portfolio", "Portfolio"],
  ["gallery", "Gallery"],
  ["practitioner_profile", "Practitioner profile"],
  ["venue_collective", "Venue / Collective"],
  ["organisation", "Organisation"],
  ["professional_profile", "Professional profile"],
];

const ctas = [
  ["contact", "Contact me"],
  ["conversation", "Book a conversation"],
  ["viewing", "Request viewing"],
  ["work_enquiry", "Enquire about work"],
  ["visit_partner_support", "Visit / partner / support"],
];

type BetaForm = {
  displayName: string;
  presenceType: string;
  desiredSlug: string;
  headline: string;
  primaryPurpose: string;
  primaryCta: string;
  location: string;
  description: string;
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
    location: "",
    description: "",
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

  function submit(event: FormEvent<HTMLFormElement>) {
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
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...form,
        accountEmail: userEmail,
        submittedAt: new Date().toISOString(),
      }),
    );
    setSubmitted(true);
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
                  Setup request prepared
                </div>
                <p>
                  This browser has saved your beta request. Send it to the
                  Presence team, or return to Studio if your Presence has
                  already been assigned.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={mailtoHref}
                    className="rounded-2xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
                  >
                    Send setup request
                  </a>
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
            >
              Prepare beta request
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
