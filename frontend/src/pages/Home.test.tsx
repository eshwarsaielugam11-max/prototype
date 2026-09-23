import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Home } from './Home';

describe('Home Page', () => {
  it('renders project introduction, pipeline steps, and disclaimer', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText(/Voice becoming visible signal\./i)).toBeInTheDocument();
    expect(screen.getByText(/Non-invasive acoustic biomarker screening for Parkinson/i)).toBeInTheDocument();
    expect(screen.getByText(/This is a research screening tool\. It does not diagnose Parkinson/i)).toBeInTheDocument();
    expect(screen.getByText(/How the Screening Pipeline Operates/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start Live Phonation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Upload Audio File/i })).toBeInTheDocument();
  });
});
