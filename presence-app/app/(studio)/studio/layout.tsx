"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Grid3X3, LayoutDashboard, Inbox, QrCode } from "lucide-react";

const tabs = [
  { label: "Nodes", href: "/studio", icon: Grid3X3, exact: true },
  { label: "Enquiries", href: "/studio/enquiries", icon: Inbox, exact: false },
  { label: "QR", href: "/studio/qr", icon: QrCode, exact: false },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="min-h-dvh bg-[var(--p-studio-bg)] text-[var(--p-studio-text)] flex flex-col">
      <div className="flex-1 pb-16">{children}</div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-[var(--p-studio-border)] bg-[var(--p-studio-bg)] safe-bottom z-50">
        {tabs.map((tab) => {
          const active = tab.exact ? path === tab.href : path.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active
                  ? "text-[var(--p-studio-accent)]"
                  : "text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
