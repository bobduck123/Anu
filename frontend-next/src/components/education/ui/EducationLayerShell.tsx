"use client";

import { ReactNode } from "react";
import { NavbarEdu } from "@/components/education/hub/NavbarEdu";
import "@/components/education/ui/eduhub.css";
import { ThemeProvider } from "@/components/education/ui/theme-provider";

export function EducationLayerShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="edu-theme">
      <div className="edu-layout">
        <NavbarEdu />
        <div className="pt-5">{children}</div>
      </div>
    </ThemeProvider>
  );
}
