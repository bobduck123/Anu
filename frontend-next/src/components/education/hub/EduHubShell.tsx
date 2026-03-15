"use client";

import type { ReactNode } from "react";
import { EducationLayerShell } from "@/components/education/ui/EducationLayerShell";
import { EduHubDashboard } from "@/components/education/hub/EduHubDashboard";

export function EduHubShell({ children }: { children?: ReactNode }) {
  return (
    <EducationLayerShell>
      <div className="px-4 pb-16 max-w-6xl mx-auto space-y-12">
        <EduHubDashboard />
        {children}
      </div>
    </EducationLayerShell>
  );
}
