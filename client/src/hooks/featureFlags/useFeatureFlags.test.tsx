import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeatureFlagProvider, useFeatureFlags } from './useFeatureFlags';
import { useAuth } from '../useAuth';
import api from '../../lib/api';

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
  }
}));

describe('useFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = () => ({ children }: { children: ReactNode }) => (
    <FeatureFlagProvider>
      {children}
    </FeatureFlagProvider>
  );

  it('should return default flags when restaurantId is missing', async () => {
    (useAuth as any).mockReturnValue({ user: null });

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnabled('analytics')).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should fetch and provide flags for a restaurantId', async () => {
    (useAuth as any).mockReturnValue({ user: { restaurantId: 'rest_123' } });
    (api.get as any).mockResolvedValueOnce({
      data: { data: [{ key: 'analytics', enabled: true }, { key: 'qr_menu', enabled: false }] }
    });

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.get).toHaveBeenCalledWith('/restaurants/rest_123/feature-flags');
    expect(result.current.isEnabled('analytics')).toBe(true);
    expect(result.current.isEnabled('qr_menu')).toBe(false);
    expect(result.current.isEnabled('non_existent')).toBe(false);
  });
});
