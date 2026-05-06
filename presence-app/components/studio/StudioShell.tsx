"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Globe, LayoutDashboard, Image, FolderOpen, Inbox, QrCode, BarChart2, Settings } from "lucide-react";
import type { PresenceNode } from "@/lib/api/types";
import { StatusPill } from "@/components/ui";

const NAV_TABS = [
  { label: "Overview", icon: LayoutDashboard, sub: "" },
  { label: "Works", icon: Image, sub: "works" },
  { label: "Collections", icon: FolderOpen, sub: "collections" },
  { label: "Enquiries", icon: Inbox, sub: "enquiries" },
  { label: "QR & NFC", icon: QrCode, sub: "qr" },
  { label: "Analytics", icon: BarChart2, sub: "analytics" },
  { label: "Settings", icon: Settings, sub: "settings" },
];

export default function StudioShell({
  node,
  children,
}: {
  node: PresenceNode;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const base = `/studio/${node.id}`;

  return (
    <div className="min-h-dvh bg-[var(--p-studio-bg)] text-[var(--p-studio-text)] flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-[var(--p-studio-border)] bg-[var(--p-studio-bg)]/90 backdrop-blur safe-top">
        <Link href="/studio" className="text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="font-semibold text-sm truncate">{node.display_name}</span>
          {node.public_url && (
            <a
              href={node.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[var(--p-studio-muted)] hover:text-[var(--p-studio-accent)] transition-colors truncate"
            >
              <Globe className="w-3 h-3 shrink-0" />
              {node.slug}
            </a>
          )}
        </div>
        <StatusPill status={node.status} />
      </header>

      {/* Horizontal scroll tab bar */}
      <nav className="flex overflow-x-auto scrollbar-none border-b border-[var(--p-studio-border)] px-4 shrink-0">
        {NAV_TABS.map((tab) => {
          const href = tab.sub ? `${base}/${tab.sub}` : base;
          const active = tab.sub ? path.startsWith(`${base}/${tab.sub}`) : path === base;
          return (
            <Link
              key={tab.sub}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? "border-[var(--p-studio-accent)] text-[var(--p-studio-accent)]"
                  : "border-transparent text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-6">{children}</main>
    </div>
  );
}
