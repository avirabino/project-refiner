import { render, screen } from '@testing-library/react';
import { HealthIndicator } from './HealthIndicator';

describe('HealthIndicator', () => {
  it('shows server OK when status is ok', () => {
    render(<HealthIndicator health={{ status: 'ok', version: '2.0.0' }} />);
    expect(screen.getByText(/Server OK/)).toBeInTheDocument();
  });

  it('shows server offline when status is error', () => {
    render(<HealthIndicator health={{ status: 'error' }} />);
    expect(screen.getByText('Server offline')).toBeInTheDocument();
  });

  it('displays version when available', () => {
    render(<HealthIndicator health={{ status: 'ok', version: '2.0.0' }} />);
    expect(screen.getByText(/v2\.0\.0/)).toBeInTheDocument();
  });

  it('displays LLM mode when available', () => {
    render(<HealthIndicator health={{ status: 'ok', llmMode: 'mock' }} />);
    expect(screen.getByText('(mock)')).toBeInTheDocument();
  });

  it('has data-testid attribute', () => {
    render(<HealthIndicator health={{ status: 'ok' }} />);
    expect(screen.getByTestId('server-health-status')).toBeInTheDocument();
  });
});
