"use client";

import Link from "next/link";
import { BookOpen, Compass, Leaf, ShieldCheck, Sprout, TreePine } from "lucide-react";

const layerCards = [
  {
    href: "/education/immersive",
    title: "Immersive Layer",
    description: "Digital bush walk, seasonal knowledge, and cultural camp insights.",
    icon: Leaf,
    label: "Public entry",
  },
  {
    href: "/education/systems",
    title: "Systems Layer",
    description: "Ecological relationships, harvest simulation, and landscape toggles.",
    icon: Compass,
    label: "Systems literacy",
  },
  {
    href: "/education/curriculum",
    title: "Curriculum Layer",
    description: "Program → Module → Topic → Reflection → Action progression.",
    icon: BookOpen,
    label: "Structured learning",
  },
  {
    href: "/education/governance",
    title: "Governance Layer",
    description: "Sensitivity tiers, lineage, and verifier approvals.",
    icon: ShieldCheck,
    label: "Cultural authority",
  },
  {
    href: "/education/regeneration",
    title: "Regeneration Layer",
    description: "Knowledge completion unlocks subtle regenerative actions.",
    icon: Sprout,
    label: "Action link",
  },
  {
    href: "/admin/education",
    title: "Education Admin",
    description: "Program metrics, reflection insights, and approval visibility.",
    icon: TreePine,
    label: "Educator cockpit",
  },
];

export function EducationLayerBrief() {
  return (
    <div className="space-y-6">
      <div className="edu-card edu-card-highlight p-6 space-y-3">
        <p className="text-sm uppercase tracking-wide text-[var(--edu-accent)]">Layered Pathways</p>
        <h2 className="text-2xl font-semibold">Navigate the education stack</h2>
        <p className="text-sm text-[var(--edu-foreground)]/70">
          Each layer aligns with the indigenous museum interface, systems literacy, structured curriculum, governance, and applied regeneration.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {layerCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="edu-card p-4 space-y-2 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <span className="edu-pill text-[var(--edu-accent)]">{card.label}</span>
              </div>
              <p className="text-sm text-[var(--edu-foreground)]/70">{card.description}</p>
              <div className="flex items-center gap-2 text-xs text-[var(--edu-foreground)]">
                <Icon className="h-4 w-4" />
                <span>Explore</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
