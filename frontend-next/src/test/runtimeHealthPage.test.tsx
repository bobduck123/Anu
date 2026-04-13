// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import AdminRuntimeHealthPage from '@/app/(app)/admin/runtime-health/page';

describe('AdminRuntimeHealthPage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders runtime diagnostics with endpoint pass/fail status', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/control/core/health')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200, statusText: 'OK' });
      }
      return new Response(JSON.stringify({ status: 'down' }), {
        status: 503,
        statusText: 'Service Unavailable',
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminRuntimeHealthPage />);

    expect(await screen.findByText('Runtime health contract')).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/control/core/health',
      expect.objectContaining({ method: 'GET', credentials: 'include', cache: 'no-store' }),
    );
    expect(screen.getByText('/_core/health')).toBeInTheDocument();
    expect(screen.getByText('/_core/readiness')).toBeInTheDocument();
    expect(screen.getAllByText(/PASS|FAIL/).length).toBeGreaterThan(0);
  });
});
