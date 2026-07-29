import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeatureFlagProvider, useFeatureFlags } from './useFeatureFlags';
import { useAuth } from '../useAuth';
import api from '../../lib/api';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
  }
}));

// Mock components
const ProtectedComponent = () => {
    const { isEnabled, isLoading } = useFeatureFlags();
    if (!isLoading && !isEnabled('analytics')) {
        return <div data-testid="redirected">Redirected</div>;
    }
    return <div data-testid="protected-content">Protected Content</div>;
};

const LayoutComponent = () => {
    const { isEnabled, isLoading } = useFeatureFlags();

    if (isLoading) return <div data-testid="loading">Loading...</div>;

    return (
        <div>
            <div data-testid="visible-always">Always Visible</div>
            {isEnabled('analytics') && (
                <div data-testid="hidden-when-disabled">Hidden when disabled</div>
            )}
        </div>
    );
};

const createWrapper = () => ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <FeatureFlagProvider>
      {children}
    </FeatureFlagProvider>
  </MemoryRouter>
);

describe('FeatureFlag UI & Route Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UI Component rendering based on flags', () => {
      it('hides elements when feature flag is disabled', async () => {
          (useAuth as any).mockReturnValue({ user: { restaurantId: 'rest_123' } });
          (api.get as any).mockResolvedValueOnce({
            data: { data: [{ key: 'analytics', enabled: false }] }
          });

          render(<LayoutComponent />, { wrapper: createWrapper() });

          await waitFor(() => {
              expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
          });

          expect(screen.getByTestId('visible-always')).toBeInTheDocument();
          expect(screen.queryByTestId('hidden-when-disabled')).not.toBeInTheDocument();
      });

      it('shows elements when feature flag is enabled', async () => {
          (useAuth as any).mockReturnValue({ user: { restaurantId: 'rest_123' } });
          (api.get as any).mockResolvedValueOnce({
            data: { data: [{ key: 'analytics', enabled: true }] }
          });

          render(<LayoutComponent />, { wrapper: createWrapper() });

          await waitFor(() => {
              expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
          });

          expect(screen.getByTestId('visible-always')).toBeInTheDocument();
          expect(screen.getByTestId('hidden-when-disabled')).toBeInTheDocument();
      });
  });

  describe('Route protection based on flags', () => {
      it('redirects when attempting to access a route with disabled feature flag', async () => {
          (useAuth as any).mockReturnValue({ user: { restaurantId: 'rest_123' } });
          (api.get as any).mockResolvedValueOnce({
            data: { data: [{ key: 'analytics', enabled: false }] }
          });

          render(<ProtectedComponent />, { wrapper: createWrapper() });

          await waitFor(() => {
              expect(screen.getByTestId('redirected')).toBeInTheDocument();
          });

          expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      });

      it('renders route content when attempting to access a route with enabled feature flag', async () => {
          (useAuth as any).mockReturnValue({ user: { restaurantId: 'rest_123' } });
          (api.get as any).mockResolvedValueOnce({
            data: { data: [{ key: 'analytics', enabled: true }] }
          });

          render(<ProtectedComponent />, { wrapper: createWrapper() });

          await waitFor(() => {
              expect(screen.getByTestId('protected-content')).toBeInTheDocument();
          });

          expect(screen.queryByTestId('redirected')).not.toBeInTheDocument();
      });
  });
});
