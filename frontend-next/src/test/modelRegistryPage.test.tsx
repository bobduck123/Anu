// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/runtime', () => ({
  getCoreApiBase: () => 'https://core.example',
}));

import ModelRegistryPage from '@/app/(app)/governance/model-registry/page';

const fetchMock = vi.fn();

describe('ModelRegistryPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders archive markers and opens a manuscript chamber for a selected model', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          models: [
            {
              key: 'sovereignty_index',
              version: 3,
              description: 'Tracks node sovereignty and dependency exposure.',
              required_inputs: ['capital_balance', 'mutual_aid_capacity'],
              param_schema: { decay_window: 21, weighting_mode: 'federated' },
              output_units: 'score',
              confidence_method: 'bayesian',
              uncertainty_format: 'credible_interval',
              update_policy: 'scheduled_review',
              requires_backtest: true,
              requires_calibration: false,
            },
          ],
        },
      }),
    });

    render(<ModelRegistryPage />);

    expect(screen.getByText('Arrive in the archive before you read the manuscript.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter archive/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /sovereignty index/i })).toBeInTheDocument());
    expect(screen.getAllByText('Tracks node sovereignty and dependency exposure.').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /enter archive/i }));
    fireEvent.click(screen.getByRole('button', { name: /sovereignty index/i }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getAllByText('Sovereignty Index').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Probabilistic contour').length).toBeGreaterThan(1);
    expect(screen.getByText('Backtest required before activation')).toBeInTheDocument();
  });

  it('supports keyboard descent through the archive after entering', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          models: [
            { key: 'sovereignty_index', version: 3, description: 'Tracks node sovereignty.' },
            { key: 'care_pressure_proto', version: 1, description: 'Pilot care routing model.' },
          ],
        },
      }),
    });

    render(<ModelRegistryPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /sovereignty index/i })).toBeInTheDocument());
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getAllByText('Care Pressure Proto').length).toBeGreaterThan(0);
  });

  it('filters the archive by state', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          models: [
            {
              key: 'sovereignty_index',
              version: 3,
              description: 'Tracks node sovereignty.',
            },
            {
              key: 'prototype_care_model',
              version: 1,
              description: 'Pilot care routing model.',
            },
          ],
        },
      }),
    });

    render(<ModelRegistryPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /sovereignty index/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /prototype care model/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Experimental' }));

    expect(screen.getByRole('button', { name: /prototype care model/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sovereignty index/i })).not.toBeInTheDocument();
  });

  it('shows an honest archive sync error when the registry request fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: {
          message: 'Registry unavailable',
        },
      }),
    });

    render(<ModelRegistryPage />);

    await waitFor(() =>
      expect(screen.getByText('Live model registry sync is unavailable in this environment.')).toBeInTheDocument(),
    );
    expect(screen.getByText(/fallback models while registry sync recovers/i)).toBeInTheDocument();
  });
});
