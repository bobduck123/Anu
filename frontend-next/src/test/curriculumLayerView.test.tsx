// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CurriculumLayerView } from '@/components/education/CurriculumLayerView';

const listProgramsMock = vi.fn();
const getProgramMock = vi.fn();
const listProgressMock = vi.fn();
const listReflectionsMock = vi.fn();
const upsertProgressMock = vi.fn();
const submitReflectionMock = vi.fn();

let authLoading = false;
let authenticated = false;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authenticated,
    isLoading: authLoading,
  }),
}));

vi.mock('@/lib/api/educationStack', () => ({
  educationStackApi: {
    listPrograms: listProgramsMock,
    getProgram: getProgramMock,
    listProgress: listProgressMock,
    listReflections: listReflectionsMock,
    upsertProgress: upsertProgressMock,
    submitReflection: submitReflectionMock,
  },
}));

describe('CurriculumLayerView', () => {
  beforeEach(() => {
    authLoading = false;
    authenticated = false;
    listProgramsMock.mockReset();
    getProgramMock.mockReset();
    listProgressMock.mockReset();
    listReflectionsMock.mockReset();
    upsertProgressMock.mockReset();
    submitReflectionMock.mockReset();
  });

  it('renders progression scaffolding and module content in guest mode', async () => {
    listProgramsMock.mockResolvedValueOnce({
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

    getProgramMock.mockResolvedValueOnce({
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

    await waitFor(() => expect(getProgramMock).toHaveBeenCalledWith(1));

    expect(screen.getByText(/progression with practical outcomes/i)).toBeInTheDocument();
    expect(screen.getByText(/custodial foundations/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in to track/i })).toHaveAttribute('href', '/auth?returnTo=%2Feducation%2Fcurriculum');
    expect(screen.getByRole('link', { name: /regeneration actions/i })).toHaveAttribute('href', '/education/regeneration');
  });

  it('shows actionable fallback guidance when program loading fails', async () => {
    listProgramsMock.mockRejectedValueOnce(new Error('service unavailable'));

    render(<CurriculumLayerView />);

    await waitFor(() => {
      expect(screen.getByText(/education curriculum is temporarily unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /back to education hub/i })).toHaveAttribute('href', '/education');
    expect(screen.getByRole('link', { name: /open maps/i })).toHaveAttribute('href', '/education/maps');
    expect(screen.getByRole('link', { name: /open regeneration/i })).toHaveAttribute('href', '/education/regeneration');
  });
});
