"use client";

// Shared shells used across blueprints. Each blueprint composes these
// with its own ordering, treatment, and accents — they should never
// look the same across two blueprints.

import Link from "next/link";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { PublicEnquiryDialog } from "@/components/portfolio/PublicEnquiryDialog";
import type { PresenceNode } from "@/lib/api/types";

interface CtaProps {
  node: PresenceNode;
  label: string;
  className?: string;
}

export function PrimaryCta({ node, label, className }: CtaProps) {
  if (node.primary_cta_url) {
    const external = node.primary_cta_url.startsWith("http");
    return (
      <a
        href={node.primary_cta_url}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={className ?? "presence-cta-primary"}
      >
        <span>{label}</span>
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </a>
    );
  }
  return (
    <PublicEnquiryDialog
      slug={node.slug}
      displayName={node.display_name}
      nodeType={node.node_type}
      triggerLabel={label}
      triggerClassName={className ?? "presence-cta-primary"}
    />
  );
}

export function SecondaryContact({ node }: { node: PresenceNode }) {
  if (!node.public_email && !node.public_phone) return null;
  return (
    <div className="presence-secondary-contact">
      {node.public_email && (
        <a href={`mailto:${node.public_email}`} className="presence-pill">
          <Mail className="h-4 w-4" aria-hidden /> {node.public_email}
        </a>
      )}
      {node.public_phone && (
        <a href={`tel:${node.public_phone}`} className="presence-pill">
          <Phone className="h-4 w-4" aria-hidden /> {node.public_phone}
        </a>
      )}
    </div>
  );
}

export function visibleWorks(node: PresenceNode) {
  return (node.works ?? node.gallery_items ?? []).filter((w) => w.is_visible !== false);
}
export function visibleServices(node: PresenceNode) {
  return (node.services ?? []).filter((s) => s.is_visible !== false);
}
export function visibleLinks(node: PresenceNode) {
  return (node.links ?? []).filter((l) => l.is_visible !== false);
}
export function visibleProof(node: PresenceNode) {
  return (node.proof_items ?? []).filter((p) => (p.testimonial || p.title || p.outcome));
}

export function workThumb(work: { thumbnail_url?: string | null; image_url?: string | null }): string | null {
  return work.thumbnail_url ?? work.image_url ?? null;
}

export function workLink(slug: string, work: { id?: number; slug?: string | null }, fallbackIndex: number): string {
  return `/p/${slug}/works/${work.id ?? work.slug ?? fallbackIndex}`;
}
