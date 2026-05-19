"use client";

// Stage 5 — preview, optional refinement, and the setup-request form.

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { StudioManifest } from "@/lib/presence/studio/manifest";
import { type ResolvedSelection, buildSetupRequestPayload, type SetupFormFields } from "@/lib/presence/studio/useStudioState";
import { submitSetupRequest, type SetupRequestResult } from "@/lib/presence/studio/adapter";
import { Field, ConsentRow } from "./formHelpers";
import { DeepRefinementPanel } from "./steps";

interface StepSubmitProps {
  manifest: StudioManifest;
  resolved: ResolvedSelection;
  refineOpen: boolean;
  onToggleRefine: () => void;
  onPace: (id: string) => void;
  onContact: (id: string) => void;
  onTone: (tone: string) => void;
  onSubmitted: (result: SetupRequestResult) => void;
}

const EMPTY_FIELDS: SetupFormFields = {
  displayName: "",
  contactName: "",
  email: "",
  phone: "",
  whatYoureBuilding: "",
  notes: "",
  doNotWants: "",
  references: ["", ""],
  consentToContact: false,
};

export default function StepSubmit({
  manifest,
  resolved,
  refineOpen,
  onToggleRefine,
  onPace,
  onContact,
  onTone,
  onSubmitted,
}: StepSubmitProps) {
  const [fields, setFields] = useState<SetupFormFields>(EMPTY_FIELDS);
  const [termsAck, setTermsAck] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [stateBanner, setStateBanner] = useState<string | null>(null);

  function update<K extends keyof SetupFormFields>(key: K, value: SetupFormFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function setReference(i: number, value: string) {
    setFields((prev) => {
      const refs = [...prev.references];
      refs[i] = value;
      return { ...prev, references: refs };
    });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!fields.displayName.trim()) e.displayName = "We need a name for this place.";
    if (!fields.contactName.trim()) e.contactName = "Your name, please.";
    if (!fields.email.trim()) e.email = "We need an email so we can write back.";
    else if (!/.+@.+\..+/.test(fields.email)) e.email = "That email doesn't look right.";
    if (!fields.whatYoureBuilding.trim() || fields.whatYoureBuilding.trim().length < 10) e.whatYoureBuilding = "A line or two about what you're building, please.";
    if (!fields.consentToContact) e.consentToContact = "Please tick this so we know we can write to you.";
    if (!termsAck) e.termsAck = "Please tick this to confirm you've read the terms.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setStateBanner(null);
    const payload = buildSetupRequestPayload(fields, resolved, manifest);
    const result = await submitSetupRequest(payload);
    setSubmitting(false);
    if (result.state === "validation_error") {
      if (result.errors) setErrors((prev) => ({ ...prev, ...result.errors }));
      setStateBanner(result.message ?? "Some details need a second look.");
      return;
    }
    if (result.state === "saved_locally") {
      setStateBanner(result.message ?? "Saved on this device. We'll try sending again when you're online.");
    }
    onSubmitted(result);
  }

  const directionLine = (
    <>
      {resolved.world?.label ?? "A place"} for the{" "}
      <em>{resolved.identity?.label?.toLowerCase() ?? "practitioner"}</em>, moving as{" "}
      <em>{resolved.movement?.label?.toLowerCase() ?? "you choose"}</em>.
    </>
  );

  return (
    <section>
      <header className="studio-stage-head">
        <p className="stage-eyebrow">Stage 5 · Preview &amp; send</p>
        <h2>Here&apos;s where <em>we&apos;d start.</em></h2>
        <p className="stage-lede">A first read of your direction. Nothing here is public — submitting opens a thread with our studio team and they&apos;ll be in touch by email about next steps.</p>
      </header>

      <div className="presence-studio-card direction-card">
        <p className="card-eyebrow">Your direction reads as</p>
        <p className="direction-line">{directionLine}</p>
        <p className="direction-meta">
          {resolved.mood?.label} light · {resolved.material?.label?.toLowerCase()} materials
          {resolved.pace ? ` · ${resolved.pace.label.toLowerCase()} pace` : ""}
          {resolved.contact ? ` · ${resolved.contact.label.toLowerCase()}` : ""}.
        </p>
      </div>

      <button
        type="button"
        className="presence-studio-refine-toggle"
        aria-expanded={refineOpen}
        onClick={onToggleRefine}
      >
        <span>
          <span className="refine-tag">Optional</span>
          <span className="refine-label">Refine further</span>
        </span>
        <span className="refine-cue">
          {refineOpen ? <>Hide <ChevronUp className="h-4 w-4" aria-hidden /></> : <>Pace · Contact · Tone · References <ChevronDown className="h-4 w-4" aria-hidden /></>}
        </span>
      </button>

      {refineOpen && (
        <DeepRefinementPanel
          manifest={manifest}
          resolved={resolved}
          onPace={onPace}
          onContact={onContact}
          onTone={onTone}
        />
      )}

      <div className="presence-studio-card setup-card">
        <p className="card-eyebrow">Setup request</p>
        <p className="setup-headline">A few details before we begin.</p>

        <div className="studio-grid studio-grid-2 setup-grid">
          <Field label="What should we call this place?" hint="Studio Lévy · or your own name." error={errors.displayName}>
            <input type="text" maxLength={60} value={fields.displayName} onChange={(e) => update("displayName", e.target.value)} />
          </Field>
          <Field label="Your name" error={errors.contactName}>
            <input type="text" maxLength={80} value={fields.contactName} onChange={(e) => update("contactName", e.target.value)} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" inputMode="email" value={fields.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Phone (optional)" hint="If you'd like a call rather than email.">
            <input type="tel" inputMode="tel" value={fields.phone} onChange={(e) => update("phone", e.target.value)} />
          </Field>
        </div>

        <div className="setup-fullwidth">
          <Field label="What are you building?" hint="A line or two. We'll ask follow-ups." error={errors.whatYoureBuilding}>
            <textarea maxLength={400} rows={3} value={fields.whatYoureBuilding} onChange={(e) => update("whatYoureBuilding", e.target.value)} />
          </Field>
        </div>

        <button type="button" className="presence-studio-more-toggle" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen}>
          Add references &amp; do-not-wants <span className="optional">(optional)</span> {moreOpen ? "▾" : "▸"}
        </button>
        {moreOpen && (
          <div className="presence-studio-more">
            <div className="studio-grid studio-grid-2">
              <Field label="Reference — practice or venue whose tone you admire">
                <input type="url" placeholder="https://…" value={fields.references[0] ?? ""} onChange={(e) => setReference(0, e.target.value)} />
              </Field>
              <Field label="Reference — another">
                <input type="url" placeholder="https://…" value={fields.references[1] ?? ""} onChange={(e) => setReference(1, e.target.value)} />
              </Field>
            </div>
            <Field label="Anything we should not do? (Optional)">
              <textarea maxLength={300} rows={2} value={fields.doNotWants} onChange={(e) => update("doNotWants", e.target.value)} />
            </Field>
            <Field label="Anything else we should know? (Optional)">
              <textarea maxLength={600} rows={2} value={fields.notes} onChange={(e) => update("notes", e.target.value)} />
            </Field>
          </div>
        )}

        <hr className="setup-rule" />
        <ConsentRow
          checked={fields.consentToContact}
          onChange={(v) => update("consentToContact", v)}
          error={errors.consentToContact}
        >
          Yes — get in touch about this Presence.
        </ConsentRow>
        <ConsentRow
          checked={termsAck}
          onChange={setTermsAck}
          error={errors.termsAck}
        >
          I&apos;ve read the studio terms &amp; privacy notice.
        </ConsentRow>

        <div className="setup-trust">
          <p className="card-eyebrow">Before you send</p>
          <ul>
            <li>Nothing is public yet — this is a setup request.</li>
            <li>Our studio team will read it before anything is built.</li>
            <li>We may ask for images, copy, links or references before we begin.</li>
            <li>You&apos;ll approve every draft before anything goes live.</li>
          </ul>
        </div>

        {stateBanner && (
          <div className="setup-state-banner" role="status">{stateBanner}</div>
        )}

        <div className="setup-actions">
          <span className="studio-chip studio-chip-quiet">● not public yet</span>
          <button
            type="button"
            className="studio-btn studio-btn-primary studio-btn-wide"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? "Sending…" : "Send setup request →"}
          </button>
        </div>
      </div>
    </section>
  );
}
