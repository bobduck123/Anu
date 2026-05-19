"use client";

// SubmissionConfirmation — the screen after the setup request is sent
// (or stored locally). Communicates the studio team takes it from
// here. Reassures: nothing is public yet.

import type { ResolvedSelection } from "@/lib/presence/studio/useStudioState";
import type { SetupRequestResult } from "@/lib/presence/studio/adapter";
import { TrustCard } from "./formHelpers";

interface Props {
  result: SetupRequestResult;
  resolved: ResolvedSelection;
  onReset: () => void;
}

export default function SubmissionConfirmation({ result, resolved, onReset }: Props) {
  const isLocal = result.state === "saved_locally";
  const reference = result.reference
    ?? `PS-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

  return (
    <section className="presence-studio-confirmation">
      <div className="confirmation-banner">
        <div>
          <p className="card-eyebrow">
            {isLocal
              ? "Saved on this device · awaiting send"
              : `Setup request received · #${reference}`}
          </p>
          <h2 className="confirmation-title">
            We&apos;ve got your <em>direction.</em>
          </h2>
          <p className="confirmation-prose">
            {isLocal
              ? "We couldn't reach the studio just now — your direction is safely held on this device. Refresh later and we'll try to send it again."
              : "Our studio team will pick this up from here. We'll be in touch by email to confirm next steps. Nothing is public — your direction stays a private thread until you approve a draft."}
          </p>
        </div>
        <span className="studio-chip studio-chip-accent">● thread {isLocal ? "saved" : "open"}</span>
      </div>

      <div className="studio-grid studio-grid-4 confirmation-trust">
        <TrustCard
          tone="auto"
          title="What&apos;s automated"
          items={[
            "Your direction is saved as a setup request.",
            "A studio thread opens in your inbox.",
            "An owner is assigned for the review.",
            "Working drafts use your direction as the start frame.",
          ]}
        />
        <TrustCard
          tone="hand"
          title="What our team refines"
          items={[
            "Photography direction and retouching.",
            "Copy — your voice, not generic luxury talk.",
            "Object materials tuned to your actual works.",
            "Names, proportions, room cuts — set with you.",
          ]}
        />
        <TrustCard
          tone="editable"
          title="Editable later, always"
          items={[
            "All five direction choices.",
            "Room titles, copy, photos.",
            "Adding or hiding rooms.",
            "Swapping or stacking contact styles.",
          ]}
        />
        <TrustCard
          tone="you"
          title="What we&apos;ll ask you for"
          items={[
            "10–30 images of your work, any quality.",
            "A few lines about how you want to be read.",
            "Two practices whose tone you admire.",
            "Anything you do NOT want.",
          ]}
        />
      </div>

      <footer className="confirmation-footer">
        <p className="footer-eyebrow">Presence Studio · session complete</p>
        <div>
          <button type="button" className="studio-btn studio-btn-ghost" onClick={onReset}>Start another</button>
        </div>
      </footer>

      {resolved.identity && (
        <p className="confirmation-recall">
          For our records: a {resolved.world?.label ?? "place"} for {resolved.identity.label.toLowerCase()},
          moving as {resolved.movement?.label?.toLowerCase() ?? "chosen later"}.
        </p>
      )}
    </section>
  );
}
