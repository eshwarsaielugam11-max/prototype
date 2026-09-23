import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Record } from './Record';

describe('Record Page', () => {
  it('renders record page with protocol instructions and audio recorder', () => {
    // Mock canvas context
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    });

    render(
      <BrowserRouter>
        <Record />
      </BrowserRouter>
    );

    expect(screen.getByText(/Live Voice Phonation Recording/i)).toBeInTheDocument();
    expect(screen.getByText(/Recording Task Protocol: Sustained Vowel \/a\//i)).toBeInTheDocument();
    expect(screen.getByText(/Recording Best Practices/i)).toBeInTheDocument();
  });
});
