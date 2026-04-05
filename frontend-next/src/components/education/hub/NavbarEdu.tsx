"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sun, Moon, Menu, X, Award, BookOpen, Home, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import { useTheme } from "@/components/education/ui/theme-provider";
import { Button } from "@/components/education/ui/button";

const navItems = [
  { href: "/education", label: "Education", icon: Home },
  { href: "/education/maps", label: "Maps", icon: Sparkles },
  { href: "/universe", label: "Universe", icon: Sparkles },
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
    <header className="sticky top-3 z-30 px-4 md:px-0">
      <div className="edu-glass relative mx-auto max-w-6xl overflow-hidden border">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f6d4cb]/75 to-transparent" />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/education" className="manara-glass-chip flex items-center gap-3 border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-2 py-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:rgba(246,212,203,0.18)] bg-[radial-gradient(circle_at_35%_30%,#f6d4cb,transparent_40%),linear-gradient(160deg,#1e0227,#1e0227)] shadow-[0_8px_18px_-10px_rgba(30,2,39,0.9)]">
              <Leaf className="h-4.5 w-4.5 text-[#f6d4cb]" />
            </div>
            <div>
              <span className="block text-[0.98rem] font-semibold text-[var(--edu-foreground)]" style={{ fontFamily: "var(--font-serif)" }}>
                Manara Education
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--edu-foreground)]/60">Learning pathways</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`manara-glass-chip inline-flex min-h-9 items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                    isActive(link.href)
                      ? "border-[#f6d4cb]/35 bg-[rgba(246,212,203,0.14)] text-[#f6d4cb]"
                      : "border-transparent text-[var(--edu-foreground)]/74 hover:border-[color:rgba(246,212,203,0.14)] hover:bg-[color:rgba(246,212,203,0.08)] hover:text-[var(--edu-foreground)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
              aria-label={`Switch theme. Current theme: ${resolvedTheme}`}
              className="border-[color:rgba(246,212,203,0.14)] bg-[color:rgba(246,212,203,0.06)] text-[var(--edu-foreground)] hover:bg-[color:rgba(246,212,203,0.12)]"
            >
              {resolvedTheme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen((prev) => !prev)}
              aria-label={open ? "Close education menu" : "Open education menu"}
              aria-expanded={open}
              aria-controls="education-mobile-nav"
              className="md:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {open ? (
          <div id="education-mobile-nav" className="border-t border-[color:rgba(246,212,203,0.1)] px-4 pb-4 pt-3 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`manara-glass-chip border px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] ${
                    isActive(link.href)
                      ? "border-[#f6d4cb]/32 bg-[rgba(246,212,203,0.12)] text-[#f6d4cb]"
                      : "border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] text-[var(--edu-foreground)]/82"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
