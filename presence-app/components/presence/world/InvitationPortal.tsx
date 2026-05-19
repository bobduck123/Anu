"use client";

// InvitationPortal — the CTA-as-portal. Replaces "send enquiry" buttons
// with a portal card that feels like a door, an invitation, or a
// threshold. Designed so the call-to-action is the last and most
// considered room-object.

import { ArrowUpRight, MailOpen } from "lucide-react";
import type { PresenceNode } from "@/lib/api/types";
import { PublicEnquiryDialog } from "@/components/portfolio/PublicEnquiryDialog";

interface InvitationPortalProps {
  node: PresenceNode;
  label: string;
  invitationCopy?: string;
  variant?: "card" | "door" | "ribbon";
  className?: string;
}

export default function InvitationPortal({
  node,
  label,
  invitationCopy,
  variant = "card",
  className,
}: InvitationPortalProps) {
  const copy = invitationCopy ?? "Open a direct conversation about this work.";

  const cta = node.primary_cta_url ? (
    <a
      href={node.primary_cta_url}
      target={node.primary_cta_url.startsWith("http") ? "_blank" : undefined}
      rel={node.primary_cta_url.startsWith("http") ? "noopener noreferrer" : undefined}
      className="invitation-portal-cta"
    >
      <span>{label}</span>
      <ArrowUpRight className="h-4 w-4" aria-hidden />
    </a>
  ) : (
    <PublicEnquiryDialog
      slug={node.slug}
      displayName={node.display_name}
      nodeType={node.node_type}
      triggerLabel={label}
      triggerClassName="invitation-portal-cta"
    />
  );

  return (
    <div
      className={`presence-invitation-portal presence-invitation-portal-${variant} ${className ?? ""}`}
      data-variant={variant}
    >
      <span className="invitation-glyph" aria-hidden>
        <MailOpen className="h-5 w-5" />
      </span>
      <div className="invitation-body">
        <p className="invitation-eyebrow">Invitation</p>
        <p className="invitation-copy">{copy}</p>
        <div className="invitation-actions">{cta}</div>
      </div>
    </div>
  );
}
