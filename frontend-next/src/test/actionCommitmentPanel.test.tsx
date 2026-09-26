// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const forActionMock = vi.fn();
const publicOutcomeMock = vi.fn();
const confirmMock = vi.fn();
const cancelMock = vi.fn();
const completeMock = vi.fn();

vi.mock('@/lib/api/actionCommitments', () => ({
  actionCommitmentsApi: {
    forAction: (...args: unknown[]) => forActionMock(...args),
    publicOutcome: (...args: unknown[]) => publicOutcomeMock(...args),
    confirm: (...args: unknown[]) => confirmMock(...args),
    cancel: (...args: unknown[]) => cancelMock(...args),
    complete: (...args: unknown[]) => completeMock(...args),
  },
}));

import { ActionCommitmentPanel } from '@/components/actions/ActionCommitmentPanel';

const confirmed = {
  id: 6, action_id: 12, action_title: 'Garden', status: 'CONFIRMED',
  evidence_url: null, evidence_note: null, review_note: null,
  confirmed_at: '2026-09-26T00:00:00', submitted_at: null, reviewed_at: null,
};

describe('ANU action commitment panel', () => {
  beforeEach(() => {
    forActionMock.mockReset();
    publicOutcomeMock.mockReset();
    confirmMock.mockReset();
    cancelMock.mockReset();
    completeMock.mockReset();
    forActionMock.mockResolvedValue(null);
    publicOutcomeMock.mockResolvedValue({ action_id: 12, verified_outcomes: 0 });
  });

  it('requires an explicit confirmation before reporting a commitment', async () => {
    forActionMock.mockResolvedValueOnce(null).mockResolvedValue(confirmed);
    confirmMock.mockResolvedValue(confirmed);
    render(<ActionCommitmentPanel actionId="12" />);
    expect(await screen.findByText('No commitment has been confirmed yet.')).toBeInTheDocument();
    expect(confirmMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm commitment' }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledWith('12'));
    expect(await screen.findByText('Confirmed')).toBeInTheDocument();
  });

  it('shows durable submitted status and steward feedback after reload', async () => {
    forActionMock.mockResolvedValue({ ...confirmed, status: 'NEEDS_CHANGES', review_note: 'Add a date' });
    render(<ActionCommitmentPanel actionId="12" />);
    expect(await screen.findByText('Changes requested')).toBeInTheDocument();
    expect(screen.getByText('Steward note: Add a date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit completion for review' })).toBeInTheDocument();
  });

  it('shows a sign-in path when private account state cannot load', async () => {
    forActionMock.mockRejectedValue(new Error('unauthorized'));
    render(<ActionCommitmentPanel actionId="12" />);
    expect(await screen.findByText(/Sign in to confirm/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm commitment' })).not.toBeInTheDocument();
  });
});
