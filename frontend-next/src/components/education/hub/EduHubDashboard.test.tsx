"use client";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { educationStackApi } from "@/lib/api/educationStack";
import { EduHubDashboard } from "./EduHubDashboard";

const mockOverview = {
  summary: {
    programs: 2,
    topics: 9,
    progress_records: 12,
    completed_progress_records: 4,
    completion_rate: 68.5,
    reflection_submissions: 5,
    pending_approvals: 0,
    approved_entries: 0,
    rejected_entries: 0,
    regeneration_logs: 0,
  },
  module_performance: [],
  user_progression_distribution: {},
  recent_reflections: [],
  pending_approval_panel: [],
  generated_at: new Date().toISOString(),
};

const mockPrograms = [
  {
    program_id: 1,
    title: "Test Program",
    description: "Description placeholder",
    region: "Coastal",
    language_group: "Test",
    branch_code: "core",
    accreditation_code: "ACC-1",
    offline_package_ref: null,
    module_ids: [1],
    module_count: 1,
    topic_count: 3,
    completion_percent: 50,
    depth_tier_unlocked: 1,
  },
];

vi.mock("@/lib/api/educationStack", () => ({
  educationStackApi: {
    adminOverview: vi.fn(),
    listPrograms: vi.fn(),
  },
}));

vi.mock("@/components/education/ui/button", () => ({
  Button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

describe("EduHubDashboard", () => {
  beforeEach(() => {
    vi.mocked(educationStackApi.adminOverview).mockResolvedValue(mockOverview);
    vi.mocked(educationStackApi.listPrograms).mockResolvedValue({ programs: mockPrograms });
  });

  it("renders hero stats and programs", async () => {
    render(<EduHubDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Living Indigenous Knowledge Infrastructure/)).toBeInTheDocument();
    });
    expect(screen.getAllByText("Programs")).not.toHaveLength(0);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Test Program")).toBeInTheDocument();
    expect(screen.getByText("Coastal")).toBeInTheDocument();
  });
});
