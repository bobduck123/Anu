"use client";

import { ThemeProvider } from "@/components/education/ui/theme-provider";
import { NavbarEdu } from "@/components/education/hub/NavbarEdu";
import { EduHubDashboard } from "@/components/education/hub/EduHubDashboard";
import "@/components/education/ui/eduhub.css";

export function EduHubShell({ children }: { children?: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="edu-theme">
      <div className="edu-layout">
        <NavbarEdu />
        <div className="pt-20 px-4 pb-16 max-w-6xl mx-auto space-y-12">
          <EduHubDashboard />
          {children}
        </div>
      </div>
    </ThemeProvider>
  );
}
