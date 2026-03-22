// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const adminOverviewMock = vi.fn();
const adminApprovalsMock = vi.fn();
const adminReflectionsMock = vi.fn();

vi.mock('@/lib/api/educationStack', () => ({
  educationStackApi: {
    adminOverview: () => adminOverviewMock(),
    adminApprovals: () => adminApprovalsMock(),
    adminReflections: (params?: { topic_id?: number; user_id?: number }) => adminReflectionsMock(params),
  },
}));

import { EducationAdminDashboard } from '@/components/education/EducationAdminDashboard';

const overview = {
  summary: {
    programs: 4,
    topics: 18,
    progress_records: 120,
    completed_progress_records: 72,
    completion_rate: 60,
    reflection_submissions: 14,
    pending_approvals: 3,
    approved_entries: 10,
    rejected_entries: 1,
    regeneration_logs: 8,
  },
  module_performance: [
    {
      module_id: 21,
      module_title: 'Water knowledge',
      avg_completion_percent: 72.5,
      record_count: 16,
    },
  ],
  user_progression_distribution: {
    'Tier 1': 8,
    'Tier 2': 4,
  },
  recent_reflections: [
    {
      id: 9,
      user_id: 3,
      username: 'river-stone',
      topic_id: 7,
      prompt: 'How did the lesson land?',
      submitted_at: '2026-03-22T03:00:00.000Z',
    },
  ],
  pending_approval_panel: [],
  generated_at: '2026-03-22T04:00:00.000Z',
};

const approvals = {
  pending_entries: [
    {
      id: 14,
      region: 'Sydney basin',
      language_group: 'Dharug',
      indigenous_name: 'Murnong',
      scientific_name: 'Microseris walteri',
      season: 'spring',
      traditional_uses: 'Food and teaching root crop.',
      sensitivity_level: 'community',
      verification_status: 'pending',
      elder_verified: false,
      created_by: 8,
      media_assets: [],
      ecological_relationships: [],
      audit_log: [],
    },
  ],
  recent_approvals: [
    {
      id: 31,
      knowledge_id: 14,
      verifier_id: 2,
      decision: 'approved',
      notes: 'Custodial notes confirmed.',
      elder_verification_flag: true,
      created_at: '2026-03-22T05:00:00.000Z',
    },
  ],
};

describe('EducationAdminDashboard', () => {
  beforeEach(() => {
    adminOverviewMock.mockReset();
    adminApprovalsMock.mockReset();
    adminReflectionsMock.mockReset();

    adminOverviewMock.mockResolvedValue(overview);
    adminApprovalsMock.mockResolvedValue(approvals);
    adminReflectionsMock.mockImplementation((params?: { topic_id?: number; user_id?: number }) =>
      Promise.resolve({
        reflections: [
          {
            id: 5,
            user_id: params?.user_id || 2,
            program_id: 1,
            module_id: 21,
            topic_id: params?.topic_id || 7,
            prompt: 'What changed?',
            response_text: 'Learners started connecting water care to place stewardship.',
            submitted_at: '2026-03-22T02:30:00.000Z',
          },
        ],
      }),
    );
  });

  it('renders observatory metrics and governance panels', async () => {
    render(<EducationAdminDashboard />);

    expect(await screen.findByText('Education administration observatory')).toBeInTheDocument();
    expect(screen.getByText('Water knowledge')).toBeInTheDocument();
    expect(screen.getByText('Murnong')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /refresh dashboard/i }).length).toBeGreaterThan(0);
  });

  it('applies reflection filters through the shared control bar', async () => {
    render(<EducationAdminDashboard />);

    await screen.findByText('Education administration observatory');

    fireEvent.change(screen.getByPlaceholderText('Topic ID'), { target: { value: '7' } });
    fireEvent.change(screen.getByPlaceholderText('User ID'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => {
      expect(adminReflectionsMock).toHaveBeenLastCalledWith({ topic_id: 7, user_id: 3 });
    });
  });
});
