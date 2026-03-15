"use client";

import Link from "next/link";
import { Award, BookOpen, Compass, Leaf, ShieldCheck, Sprout } from "lucide-react";

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
    description: "Browse program structure anonymously, then sign in to track progress and reflections.",
    icon: BookOpen,
    label: "Public + learner",
  },
  {
    href: "/education/governance",
    title: "Governance Layer",
    description: "Browse approved knowledge publicly and sign in to submit new entries for verification.",
    icon: ShieldCheck,
    label: "Public registry",
  },
  {
    href: "/education/regeneration",
    title: "Regeneration Layer",
    description: "Preview how learning unlocks real-world actions, then sign in to log completions.",
    icon: Sprout,
    label: "Action preview",
  },
  {
    href: "/education/certifications",
    title: "Certifications",
    description: "Public certificate registry plus signed-in competency and credential history.",
    icon: Award,
    label: "Public registry",
  },
];

export function EducationLayerBrief() {
  return (
    <div className="space-y-6">
      <div className="edu-card edu-card-highlight p-6 space-y-3">
        <p className="text-sm uppercase tracking-wide text-[var(--edu-accent)]">Layered Pathways</p>
        <h2 className="text-2xl font-semibold">Navigate the education stack</h2>
        <p className="text-sm text-[var(--edu-foreground)]/70">
          Start with the public knowledge layers, then sign in only for learner-specific progress,
          credentials, and action logging.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {layerCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="edu-card p-4 space-y-2 transition hover:shadow-lg">
              <div className="flex items-center justify-between gap-3">
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
