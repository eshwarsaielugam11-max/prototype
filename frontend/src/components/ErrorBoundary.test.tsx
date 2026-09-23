import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const ThrowingComponent = () => {
  throw new Error('Test component intentional render explosion');
};

const SafeComponent = () => <div>Safe Component Rendered Successfully</div>;

describe('ErrorBoundary Component', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe Component Rendered Successfully')).toBeInTheDocument();
  });

  it('catches render error and displays recovery fallback UI', () => {
    // Suppress console.error in test output for intentional error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Application Error Encountered')).toBeInTheDocument();
    expect(screen.getByText(/Test component intentional render explosion/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Return to Home/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
