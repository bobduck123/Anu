// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('smoke', () => {
  it('renders a basic element', () => {
    render(<div>ok</div>);
    expect(screen.getByText('ok')).toBeTruthy();
  });
});
