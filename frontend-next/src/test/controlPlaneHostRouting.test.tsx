// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

import ControlLayout from '@/app/(control)/control/layout';

describe('control plane host routing', () => {
  beforeEach(() => {
    headersMock.mockReset();
  });

  it('rejects control routes on non-control hosts', async () => {
    headersMock.mockResolvedValue(new Headers({ host: 'app.anu.eco' }));

    const ui = await ControlLayout({
      children: <div>control-content</div>,
    });
    render(ui);

    expect(screen.getByText('Control routes are isolated to control hosts.')).toBeInTheDocument();
    expect(screen.queryByText('control-content')).not.toBeInTheDocument();
  });

  it('allows control routes on configured control hosts', async () => {
    headersMock.mockResolvedValue(new Headers({ host: 'control.anu.eco' }));

    const ui = await ControlLayout({
      children: <div>control-content</div>,
    });
    render(ui);

    expect(screen.getByText('control-content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tenants' })).toHaveAttribute('href', '/control/tenants');
    expect(screen.getByRole('link', { name: 'Runtime Health' })).toHaveAttribute('href', '/control/runtime-health');
  });

  it('prioritizes forwarded host over raw host for control-route isolation', async () => {
    headersMock.mockResolvedValue(
      new Headers({
        host: 'control.anu.eco',
        'x-forwarded-host': 'app.anu.eco',
      }),
    );

    const ui = await ControlLayout({
      children: <div>control-content</div>,
    });
    render(ui);

    expect(screen.getByText('Control routes are isolated to control hosts.')).toBeInTheDocument();
    expect(screen.queryByText('control-content')).not.toBeInTheDocument();
  });
});
