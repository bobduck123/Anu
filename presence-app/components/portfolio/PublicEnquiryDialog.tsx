"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Mail, Phone, AtSign, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { submitEnquiry } from "@/lib/api/public";
import { createClient } from "@/lib/supabase/client";

// Segment-aware enquiry types. Driven by node_type / display_mode so the
// vocabulary on a venue page differs from an artist page. Keeps backend-safe
// values that match the PresenceEnquiry.enquiry_type whitelist.
const TYPES_BY_SEGMENT: Record<string, Array<[string, string]>> = {
  artist: [
    ["work_enquiry", "Enquire about a work"],
    ["viewing", "Request a private viewing"],
    ["commission_request", "Commission a piece"],
    ["press", "Press / media"],
    ["collaboration", "Collaboration"],
    ["general", "Something else"],
  ],
  practitioner: [
    ["conversation", "Book a conversation"],
    ["work_enquiry", "Sessions / consultations"],
    ["collaboration", "Workshops / referrals"],
    ["general", "Something else"],
  ],
  venue: [
    ["visit_partner_support", "Visit / event"],
    ["collaboration", "Partner / sponsor"],
    ["work_enquiry", "Venue hire"],
    ["press", "Press / media"],
    ["general", "Something else"],
  ],
  organisation: [
    ["collaboration", "Partner with us"],
    ["visit_partner_support", "Support / sponsor"],
    ["work_enquiry", "Programs / services"],
    ["press", "Press / media"],
    ["general", "Something else"],
  ],
  consultant: [
    ["conversation", "Project discussion"],
    ["work_enquiry", "Capability / RFP"],
    ["collaboration", "Speaking / advisory"],
    ["general", "Something else"],
  ],
  tradie: [
    ["quote_request", "Request a quote"],
    ["work_enquiry", "Site visit / job"],
    ["collaboration", "Variation / follow-up"],
    ["general", "Something else"],
  ],
};

type PreferredContactMethod = "email" | "phone" | "sms" | "handle" | "in_studio" | "any";

function pickTypes(nodeType?: string): Array<[string, string]> {
  if (!nodeType) return TYPES_BY_SEGMENT.artist;
  if (nodeType in TYPES_BY_SEGMENT) return TYPES_BY_SEGMENT[nodeType];
  if (nodeType === "creative") return TYPES_BY_SEGMENT.artist;
  if (nodeType === "field_service") return TYPES_BY_SEGMENT.tradie;
  return TYPES_BY_SEGMENT.artist;
}

interface Props {
  slug: string;
  displayName: string;
  nodeType?: string;
  triggerLabel?: string;
  /** Optional className override for the trigger button. */
  triggerClassName?: string;
}

export function PublicEnquiryDialog({
  slug,
  displayName,
  nodeType,
  triggerLabel,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitterToken, setSubmitterToken] = useState<string | null>(null);
  const [submitterEmail, setSubmitterEmail] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    contact_handle: "",
    message: "",
    enquiry_type: "general",
    preferred_contact_method: "email" as PreferredContactMethod,
    consent: false,
  });
  const formStartedAt = useRef<number>(Date.now());

  const types = useMemo(() => pickTypes(nodeType), [nodeType]);

  // If a visitor is signed in, attach their Supabase token so the backend can
  // link the enquiry to the ANU User row. Anonymous submissions still work.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    formStartedAt.current = Date.now();
    setSuccess(false);
    setError(null);
    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.access_token) {
          setSubmitterToken(session.access_token);
          if (session.user?.email) {
            setSubmitterEmail(session.user.email);
            setForm((f) => (f.email ? f : { ...f, email: session.user.email ?? "" }));
          }
        }
      } catch {
        /* anonymous flow */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Body scroll lock while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("Please share your name.");
    if (!form.message.trim()) return setError("Please write a short message.");
    if (!form.consent) return setError("Please confirm consent to be contacted.");
    if (form.preferred_contact_method === "email" && !form.email.trim()) {
      return setError("Email is required when email is your preferred contact method.");
    }
    if ((form.preferred_contact_method === "phone" || form.preferred_contact_method === "sms") && !form.phone.trim()) {
      return setError("Phone is required for phone or SMS contact.");
    }
    if (form.preferred_contact_method === "handle" && !form.contact_handle.trim()) {
      return setError("Add a handle or website so they can reach you.");
    }
    if (
      (form.preferred_contact_method === "any" || form.preferred_contact_method === "in_studio") &&
      !form.email.trim() &&
      !form.phone.trim() &&
      !form.contact_handle.trim()
    ) {
      return setError("Provide at least one contact route.");
    }

    setSubmitting(true);
    try {
      await submitEnquiry(
        slug,
        {
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          contact_handle: form.contact_handle.trim() || undefined,
          message: form.message.trim(),
          enquiry_type: form.enquiry_type,
          preferred_contact_method: form.preferred_contact_method,
          consent: true,
          source_url: typeof window !== "undefined" ? window.location.href : undefined,
          source_type: "public_enquiry",
          form_started_at: formStartedAt.current,
        },
        { token: submitterToken },
      );
      setSuccess(true);
      setForm((f) => ({ ...f, message: "", consent: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send your enquiry.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const showEmail =
    form.preferred_contact_method === "email" ||
    form.preferred_contact_method === "any" ||
    form.preferred_contact_method === "in_studio";
  const showPhone =
    form.preferred_contact_method === "phone" ||
    form.preferred_contact_method === "sms" ||
    form.preferred_contact_method === "any" ||
    form.preferred_contact_method === "in_studio";
  const showHandle =
    form.preferred_contact_method === "handle" ||
    form.preferred_contact_method === "any" ||
    form.preferred_contact_method === "in_studio";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--p-accent)] text-white text-sm font-medium hover:bg-[var(--p-accent-dark)] transition-colors"
        }
      >
        <Mail className="w-4 h-4" />
        {triggerLabel ?? "Send an enquiry"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enquiry-dialog-title"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="relative w-full max-h-[90vh] overflow-y-auto sm:max-w-lg bg-[var(--p-surface)] sm:rounded-3xl rounded-t-3xl border border-[var(--p-border)] p-6 shadow-2xl text-[var(--p-text)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-[var(--p-text-muted)] hover:bg-[var(--p-surface-alt)]"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-text-muted)]">
              Begin a conversation
            </p>
            <h3 id="enquiry-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight">
              Reach {displayName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--p-text-muted)]">
              Your enquiry goes directly to {displayName}'s Studio inbox, not a loose email thread.
            </p>

            {success ? (
              <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-800">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Sent
                </div>
                <p className="text-sm leading-6">
                  {submitterEmail
                    ? `${displayName} will reach you via your preferred contact method.`
                    : "Thanks. They'll be in touch via your preferred contact method."}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="self-start rounded-xl border border-emerald-700 px-4 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                >
                  Close
                </button>
              </div>
            ) : (
              <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
                {error && (
                  <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {error}
                  </p>
                )}

                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--p-text-muted)]">
                    Reason
                  </span>
                  <select
                    value={form.enquiry_type}
                    onChange={(e) => update("enquiry_type", e.target.value)}
                    className="rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] px-3 py-2.5 outline-none focus:border-[var(--p-accent)]"
                  >
                    {types.map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--p-text-muted)]">Your name</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      required
                      autoComplete="name"
                      className="rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] px-3 py-2.5 outline-none focus:border-[var(--p-accent)]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--p-text-muted)]">Preferred contact</span>
                    <select
                      value={form.preferred_contact_method}
                      onChange={(e) => update("preferred_contact_method", e.target.value as PreferredContactMethod)}
                      className="rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] px-3 py-2.5 outline-none focus:border-[var(--p-accent)]"
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone call</option>
                      <option value="sms">SMS</option>
                      <option value="handle">Social / website</option>
                      <option value="in_studio">Meet in studio</option>
                      <option value="any">Any of the above</option>
                    </select>
                  </label>
                </div>

                {showEmail && (
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--p-text-muted)]">
                      <Mail className="w-3 h-3" /> Email
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      autoComplete="email"
                      className="rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] px-3 py-2.5 outline-none focus:border-[var(--p-accent)]"
                    />
                  </label>
                )}
                {showPhone && (
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--p-text-muted)]">
                      <Phone className="w-3 h-3" /> Phone
                    </span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      autoComplete="tel"
                      className="rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] px-3 py-2.5 outline-none focus:border-[var(--p-accent)]"
                    />
                  </label>
                )}
                {showHandle && (
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--p-text-muted)]">
                      <AtSign className="w-3 h-3" /> Handle or website
                    </span>
                    <input
                      type="text"
                      value={form.contact_handle}
                      onChange={(e) => update("contact_handle", e.target.value)}
                      placeholder="@you or https://example.com"
                      className="rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] px-3 py-2.5 outline-none focus:border-[var(--p-accent)]"
                    />
                  </label>
                )}

                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--p-text-muted)]">Message</span>
                  <textarea
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    rows={5}
                    required
                    className="rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] px-3 py-2.5 outline-none focus:border-[var(--p-accent)] resize-none"
                    placeholder={`Hi ${displayName}, ...`}
                  />
                </label>

                <label className="flex items-start gap-3 text-xs leading-5 text-[var(--p-text-muted)]">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => update("consent", e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I'm happy for {displayName} to follow up using the contact method I chose.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--p-accent-dark)] disabled:opacity-60"
                >
                  {submitting ? "Sending..." : "Send enquiry"}
                </button>

                {submitterEmail && (
                  <p className="text-[11px] leading-5 text-[var(--p-text-muted)]">
                    Signed in as <span className="font-mono">{submitterEmail}</span>. Your enquiry will be linked to your ANU account.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
