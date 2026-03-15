"use client";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { educationStackApi } from "@/lib/api/educationStack";
import { EduHubDashboard } from "./EduHubDashboard";

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
    module_ids: [1, 2],
    module_count: 2,
    topic_count: 5,
    completion_percent: 50,
    depth_tier_unlocked: 1,
  },
];

vi.mock("@/lib/api/educationStack", () => ({
  educationStackApi: {
    listPrograms: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
  }),
}));

describe("EduHubDashboard", () => {
  beforeEach(() => {
    vi.mocked(educationStackApi.listPrograms).mockResolvedValue({ programs: mockPrograms });
  });

  it("renders public catalog stats without admin data", async () => {
    render(<EduHubDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Public Education Hub/)).toBeInTheDocument();
    });
    expect(screen.getByText("Programs")).toBeInTheDocument();
    expect(screen.getByText("Modules")).toBeInTheDocument();
    expect(screen.getByText("Topics")).toBeInTheDocument();
    expect(screen.getByText("Test Program")).toBeInTheDocument();
    expect(screen.getByText(/Sign in to save learner progress/)).toBeInTheDocument();
  });
});
