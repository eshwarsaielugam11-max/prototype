import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Home } from './Home';

describe('Home Page', () => {
  it('renders hero section, explainability section, evidence section, and disclaimer', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    // Hero headline and subhead
    expect(screen.getByText(/Hear what your voice/i)).toBeInTheDocument();
    expect(screen.getByText(/reveals/i)).toBeInTheDocument();
    expect(screen.getByText(/A research screening tool translating subtle acoustic perturbations/i)).toBeInTheDocument();

    // Hero CTAs
    expect(screen.getByRole('link', { name: /Begin Screening/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /or record now with microphone/i })).toBeInTheDocument();

    // Prominent disclaimer directly below CTA
    expect(screen.getByText(/Research Tool:/i)).toBeInTheDocument();

    // Narrative sections
    expect(screen.getByText(/No black boxes\. Every finding is time-mapped to your voice\./i)).toBeInTheDocument();
    expect(screen.getByText(/Peer-reviewed literature, cited directly in every report\./i)).toBeInTheDocument();
  });
});
