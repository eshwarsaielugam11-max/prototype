import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Upload } from './Upload';

describe('Upload Page', () => {
  it('renders upload page with dropzone and format guidance', () => {
    render(
      <BrowserRouter>
        <Upload />
      </BrowserRouter>
    );

    expect(screen.getByText(/Upload Voice Audio Recording/i)).toBeInTheDocument();
    expect(screen.getByText(/Supported Audio Ingestion Formats/i)).toBeInTheDocument();
    expect(screen.getByText(/File Requirements & Limits/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop speech recording here/i)).toBeInTheDocument();
  });
});
