"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sun, Moon, Menu, X, Award, BookOpen, Home, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import { useTheme } from "@/components/education/ui/theme-provider";
import { Button } from "@/components/education/ui/button";

const navItems = [
  { href: "/education", label: "Hub", icon: Home },
  { href: "/education/maps", label: "Maps", icon: Sparkles },
  { href: "/education/immersive", label: "Immersive", icon: Leaf },
  { href: "/education/systems", label: "Systems", icon: Sparkles },
  { href: "/education/curriculum", label: "Curriculum", icon: BookOpen },
  { href: "/education/governance", label: "Governance", icon: ShieldCheck },
  { href: "/education/certifications", label: "Certs", icon: Award },
];

export function NavbarEdu() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="fixed inset-x-0 top-0 z-50 edu-glass border-b border-[var(--edu-border)]">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/education" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#7c3aed] flex items-center justify-center">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="block text-lg font-semibold text-[var(--edu-foreground)]">EduLayer</span>
            <span className="text-xs text-[var(--edu-foreground)]/70">Systems literacy</span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-4">
          {navItems.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition ${
                  isActive(link.href)
                    ? "bg-[var(--edu-accent-light)] text-[var(--edu-accent)]"
                    : "text-[var(--edu-foreground)] hover:text-[var(--edu-accent)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}>
            {resolvedTheme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen((prev) => !prev)}>
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="md:hidden px-4 pb-4">
          <div className="space-y-2">
            {navItems.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-2 rounded-2xl text-sm font-semibold text-[var(--edu-foreground)] bg-[var(--edu-card)]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
