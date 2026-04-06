// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CurriculumLayerView } from '@/components/education/CurriculumLayerView';

const authState = vi.hoisted(() => ({
  authLoading: false,
  authenticated: false,
}));

const educationStackMocks = vi.hoisted(() => ({
  listProgramsMock: vi.fn(),
  getProgramMock: vi.fn(),
  listProgressMock: vi.fn(),
  listReflectionsMock: vi.fn(),
  upsertProgressMock: vi.fn(),
  submitReflectionMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authState.authenticated,
    isLoading: authState.authLoading,
  }),
}));

vi.mock('@/lib/api/educationStack', () => ({
  educationStackApi: {
    listPrograms: educationStackMocks.listProgramsMock,
    getProgram: educationStackMocks.getProgramMock,
    listProgress: educationStackMocks.listProgressMock,
    listReflections: educationStackMocks.listReflectionsMock,
    upsertProgress: educationStackMocks.upsertProgressMock,
    submitReflection: educationStackMocks.submitReflectionMock,
  },
}));

describe('CurriculumLayerView', () => {
  beforeEach(() => {
    authState.authLoading = false;
    authState.authenticated = false;
    educationStackMocks.listProgramsMock.mockReset();
    educationStackMocks.getProgramMock.mockReset();
    educationStackMocks.listProgressMock.mockReset();
    educationStackMocks.listReflectionsMock.mockReset();
    educationStackMocks.upsertProgressMock.mockReset();
    educationStackMocks.submitReflectionMock.mockReset();
  });

  it('renders progression scaffolding and module content in guest mode', async () => {
    educationStackMocks.listProgramsMock.mockResolvedValueOnce({
      programs: [
        {
          program_id: 1,
          title: 'Country Stewardship Pathway',
          description: 'Foundational ecological curriculum.',
          region: 'ANU Beta',
          language_group: 'Gamilaraay',
          branch_code: 'BR-1',
          accreditation_code: 'ANU-EDU-001',
          offline_package_ref: null,
          microcosm_id: null,
          event_id: null,
          module_ids: [101],
          module_count: 1,
          topic_count: 1,
          completion_percent: 0,
          depth_tier_unlocked: 1,
        },
      ],
    });

    educationStackMocks.getProgramMock.mockResolvedValueOnce({
      program: {
        program_id: 1,
        title: 'Country Stewardship Pathway',
        description: 'Foundational ecological curriculum.',
        region: 'ANU Beta',
        language_group: 'Gamilaraay',
        branch_code: 'BR-1',
        accreditation_code: 'ANU-EDU-001',
      },
      modules: [
        {
          program_id: 1,
          module_id: 101,
          title: 'Custodial Foundations',
          description: 'Core knowledge and protocols.',
          sequence: 1,
          depth_tier_required: 1,
          topics: [
            {
              topic_id: 1001,
              program_id: 1,
              module_id: 101,
              title: 'Seasonal fire literacy',
              description: 'Reading fuel loads and seasonal cues.',
              depth_tier: 1,
              assessment_type: 'quiz',
              reflection_prompt: 'What changed in your understanding?',
              action_link: null,
              badge_link: null,
              sensitivity_level: 'community',
              microcosm_id: null,
              event_id: null,
              sequence: 1,
              experiences: [],
            },
          ],
        },
      ],
    });

    render(<CurriculumLayerView />);

    await waitFor(() => expect(educationStackMocks.getProgramMock).toHaveBeenCalledWith(1));

    expect(screen.getByText(/progression with practical outcomes/i)).toBeInTheDocument();
    expect(screen.getByText(/custodial foundations/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /sign in to track/i }).some((link) =>
      link.getAttribute('href') === '/auth?returnTo=%2Feducation%2Fcurriculum')).toBe(true);
    expect(screen.getByRole('link', { name: /regeneration actions/i })).toHaveAttribute('href', '/education/regeneration');
  });

  it('shows actionable fallback guidance when program loading fails', async () => {
    educationStackMocks.listProgramsMock.mockRejectedValueOnce(new Error('service unavailable'));

    render(<CurriculumLayerView />);

    await waitFor(() => {
      expect(screen.getByText(/education curriculum is temporarily unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /back to education hub/i })).toHaveAttribute('href', '/education');
    expect(screen.getByRole('link', { name: /open maps/i })).toHaveAttribute('href', '/education/maps');
    expect(screen.getByRole('link', { name: /open regeneration/i })).toHaveAttribute('href', '/education/regeneration');
  });
});
