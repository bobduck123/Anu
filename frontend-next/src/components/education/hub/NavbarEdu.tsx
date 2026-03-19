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
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f2c786]/75 to-transparent" />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/education" className="flex items-center gap-3 rounded-full px-1 py-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-[radial-gradient(circle_at_35%_30%,#f5d39f,transparent_40%),linear-gradient(160deg,#1f3a58,#12253d)] shadow-[0_8px_18px_-10px_rgba(0,0,0,0.9)]">
              <Leaf className="h-4.5 w-4.5 text-[#f5d8ab]" />
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
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                    isActive(link.href)
                      ? "border-[#f2c786]/35 bg-[rgba(242,199,134,0.14)] text-[#f5d39f]"
                      : "border-transparent text-[var(--edu-foreground)]/74 hover:border-white/14 hover:bg-white/8 hover:text-[var(--edu-foreground)]"
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
              className="border-white/14 bg-white/6 text-[var(--edu-foreground)] hover:bg-white/12"
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
          <div id="education-mobile-nav" className="border-t border-white/10 px-4 pb-4 pt-3 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] ${
                    isActive(link.href)
                      ? "border-[#f2c786]/32 bg-[rgba(242,199,134,0.12)] text-[#f5d39f]"
                      : "border-white/10 bg-black/20 text-[var(--edu-foreground)]/82"
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
