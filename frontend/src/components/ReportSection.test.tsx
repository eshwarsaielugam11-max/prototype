import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportSection } from './ReportSection';
import { ShieldAlert, BookOpen } from 'lucide-react';

describe('ReportSection Component', () => {
  it('renders title, badge, and children content in standard mode', () => {
    render(
      <ReportSection
        title="1. Model Acoustic Prediction"
        badge="Raw Neural Output"
        badgeVariant="blue"
        icon={BookOpen}
      >
        <p>Prediction content body</p>
      </ReportSection>
    );

    expect(screen.getByText('1. Model Acoustic Prediction')).toBeInTheDocument();
    expect(screen.getByText('Raw Neural Output')).toBeInTheDocument();
    expect(screen.getByText('Prediction content body')).toBeInTheDocument();
  });

  it('renders disclaimer variant with distinct amber styling', () => {
    render(
      <ReportSection
        title="4. Mandatory Disclaimer"
        badge="Non-Modifiable"
        badgeVariant="amber"
        icon={ShieldAlert}
        isDisclaimer={true}
      >
        <p>This is a non-diagnostic research screening tool.</p>
      </ReportSection>
    );

    expect(screen.getByText('4. Mandatory Disclaimer')).toBeInTheDocument();
    expect(screen.getByText(/This is a non-diagnostic research screening tool/i)).toBeInTheDocument();
  });
});
