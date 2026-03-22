// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContactPage from '@/app/(public)/contact/page';

describe('ContactPage', () => {
  it('treats contact as a routing surface with an evidence checklist', () => {
    render(<ContactPage />);

    expect(screen.getByText('Route a question with the right evidence.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open operations library/i })).toHaveAttribute('href', '/docs');
    expect(screen.getByText('Choose the right route family')).toBeInTheDocument();
    expect(screen.getByText('Send context, not just urgency')).toBeInTheDocument();
    expect(screen.getByText(/state the exact route, page, or institutional surface involved/i)).toBeInTheDocument();
  });
});
